from __future__ import annotations

import logging
from collections import Counter
from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection
from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.metrics import davies_bouldin_score, silhouette_score
from sklearn.metrics.pairwise import euclidean_distances

from chromolite.analysis.extractor import ExtractedVectorBatch
from chromolite.analysis.models import (
    ClusterInfo,
    ClusteringResult,
    ClusterQualityMetrics,
)

logger = logging.getLogger(__name__)


def compute_clustering(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> ClusteringResult:
    """
    Perform scalable K-Means / MiniBatch K-Means clustering and evaluate cluster quality per Phase 8 & 9.
    """
    if parameters is None:
        parameters = {}

    req_k = int(parameters.get("k", 8))
    algo = str(parameters.get("algorithm", "minibatch_kmeans")).lower()
    random_seed = int(parameters.get("random_seed", 42))

    n = batch.sample_size
    dim = batch.dimension or (batch.valid_embeddings.shape[1] if batch.valid_embeddings.shape[0] > 0 else 0)
    distance_metric = batch.distance_metric

    if n < 2 or dim == 0:
        empty_quality = ClusterQualityMetrics(
            silhouette_score=0.0,
            davies_bouldin_index=0.0,
            mean_intra_cluster_distance=0.0,
            mean_inter_cluster_distance=0.0,
            quality_interpretation="Collection requires at least 2 vectors to perform clustering.",
        )
        return ClusteringResult(
            algorithm=algo,
            k=0,
            clusters=[],
            quality=empty_quality,
            distance_metric=distance_metric,
            interpretation="Insufficient vectors for clustering.",
        )

    # Bound K between 2 and min(30, n - 1)
    k = min(max(2, req_k), n - 1)

    # Normalize vectors for cosine metric so Euclidean distance aligns with cosine angle
    if distance_metric == "cosine":
        norms = np.linalg.norm(batch.valid_embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        embs = (batch.valid_embeddings / norms).astype(np.float32)
    else:
        embs = batch.valid_embeddings

    # Fit clustering model
    if algo == "kmeans":
        model = KMeans(n_clusters=k, random_state=random_seed, n_init="auto")
    else:
        batch_size = min(2048, max(256, n // 5))
        model = MiniBatchKMeans(
            n_clusters=k,
            random_state=random_seed,
            batch_size=batch_size,
            n_init="auto",
        )

    labels = model.fit_predict(embs)
    centroids = model.cluster_centers_

    # Inter-cluster centroid distances
    centroid_dists = euclidean_distances(centroids, centroids)
    np.fill_diagonal(centroid_dists, np.inf)

    # Compute per-cluster statistics
    clusters: list[ClusterInfo] = []
    intra_distances_list: list[float] = []

    for c_id in range(k):
        member_indices = np.where(labels == c_id)[0]
        c_size = len(member_indices)
        if c_size == 0:
            continue

        c_embs = embs[member_indices]
        c_centroid = centroids[c_id : c_id + 1]

        # Intra-cluster distances to centroid
        dists_to_centroid = euclidean_distances(c_embs, c_centroid).flatten()
        mean_intra = float(np.mean(dists_to_centroid))
        intra_distances_list.append(mean_intra)

        # Nearest neighboring cluster
        nearest_c_id = int(np.argmin(centroid_dists[c_id]))
        nearest_c_dist = float(centroid_dists[c_id, nearest_c_id])

        # Representative vectors closest to centroid
        sorted_members_by_dist = member_indices[np.argsort(dists_to_centroid)]
        sample_ids = [batch.valid_ids[idx] for idx in sorted_members_by_dist[:5]]

        # Dominant metadata discovery
        dominant_meta: dict[str, str] = {}
        meta_keys_counter: dict[str, Counter[str]] = {}

        for m_idx in member_indices:
            m_dict = batch.valid_metadatas[m_idx]
            if m_dict:
                for mk, mv in m_dict.items():
                    if mv is not None:
                        if mk not in meta_keys_counter:
                            meta_keys_counter[mk] = Counter()
                        meta_keys_counter[mk][str(mv)] += 1

        for mk, counter in meta_keys_counter.items():
            top_val, top_cnt = counter.most_common(1)[0]
            if top_cnt >= max(2, c_size * 0.4):  # At least 40% majority
                dominant_meta[mk] = f"{top_val} ({int((top_cnt / c_size) * 100)}%)"

        clusters.append(
            ClusterInfo(
                cluster_id=c_id + 1,
                name=f"Cluster #{c_id + 1}",
                size=c_size,
                percentage=float((c_size / n) * 100.0),
                mean_intra_distance=mean_intra,
                nearest_cluster_id=nearest_c_id + 1,
                nearest_cluster_distance=nearest_c_dist,
                sample_members=sample_ids,
                dominant_metadata=dominant_meta,
            )
        )

    # Sort clusters by size descending
    clusters.sort(key=lambda c: c.size, reverse=True)

    # Calculate Quality Metrics (Silhouette & Davies-Bouldin)
    actual_k = len(set(labels))
    if actual_k > 1 and n > actual_k:
        # Sample for silhouette if collection is large
        sil_sample = min(10000, n) if n > 10000 else None
        sil_score = float(
            silhouette_score(
                embs,
                labels,
                metric="euclidean",
                sample_size=sil_sample,
                random_state=random_seed,
            )
        )
        db_score = float(davies_bouldin_score(embs, labels))
    else:
        sil_score = 0.0
        db_score = 0.0

    mean_intra_all = float(np.mean(intra_distances_list)) if intra_distances_list else 0.0
    finite_centroid_dists = centroid_dists[np.isfinite(centroid_dists)]
    mean_inter_all = float(np.mean(finite_centroid_dists)) if len(finite_centroid_dists) > 0 else 0.0

    if sil_score > 0.35:
        quality_interp = "Well-separated and tightly cohesive semantic clusters."
    elif sil_score > 0.15:
        quality_interp = "Moderate cluster separation with partial boundary overlap across partitions."
    else:
        quality_interp = "Weak cluster separation. Embeddings form a continuous dense manifold rather than distinct isolated partitions."

    quality_metrics = ClusterQualityMetrics(
        silhouette_score=sil_score,
        davies_bouldin_index=db_score,
        mean_intra_cluster_distance=mean_intra_all,
        mean_inter_cluster_distance=mean_inter_all,
        quality_interpretation=quality_interp,
    )

    interpretation = (
        f"Partitioned {n:,} vectors into {actual_k} clusters using {algo.upper()}. "
        f"Silhouette Score is {sil_score:.3f} ([-1, 1], higher indicates better separation), and "
        f"Davies-Bouldin Index is {db_score:.3f} (lower indicates tighter separation). "
        f"{quality_interp}"
    )

    return ClusteringResult(
        algorithm=algo,
        k=actual_k,
        clusters=clusters,
        quality=quality_metrics,
        distance_metric=distance_metric,
        interpretation=interpretation,
    )
