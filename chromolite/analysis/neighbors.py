from __future__ import annotations

import logging
from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection
from sklearn.neighbors import NearestNeighbors

from chromolite.analysis.extractor import ExtractedVectorBatch
from chromolite.analysis.models import (
    KnnDensityResult,
    NeighborInfo,
    VectorDensityInfo,
)
from chromolite.analysis.statistics import (
    compute_distribution_stats,
    compute_histogram,
)

logger = logging.getLogger(__name__)


def compute_knn_and_density(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> KnnDensityResult:
    """
    Compute original high-dimensional k-nearest neighbor graph and relative local density scores per Phase 5.
    """
    if parameters is None:
        parameters = {}

    req_k = int(parameters.get("k", 15))
    n = batch.sample_size
    distance_metric = batch.distance_metric

    if n < 2:
        empty_stats = compute_distribution_stats(np.array([]))
        empty_hist = compute_histogram(np.array([]))
        return KnnDensityResult(
            k=req_k,
            distance_metric=distance_metric,
            knn_distance_distribution=empty_stats,
            knn_distance_histogram=empty_hist,
            local_density_distribution=empty_stats,
            local_density_histogram=empty_hist,
            densest_vectors=[],
            sparsest_vectors=[],
            interpretation="Collection requires at least 2 vectors to compute kNN neighborhoods.",
        )

    # Effective K bounded by available vectors
    k = min(max(1, req_k), n - 1)
    sklearn_metric = "cosine" if distance_metric == "cosine" else "euclidean"

    # Fit kNN index on original embeddings
    nn = NearestNeighbors(n_neighbors=k + 1, metric=sklearn_metric, algorithm="auto")
    nn.fit(batch.valid_embeddings)

    distances, _ = nn.kneighbors(batch.valid_embeddings, n_neighbors=k + 1)

    # Exclude self at index 0 (distance = 0)
    knn_dists = distances[:, 1:]  # shape (N, K)

    mean_knn_dists = np.mean(knn_dists, axis=1)  # shape (N,)
    median_knn_dists = np.median(knn_dists, axis=1)
    nn1_dists = knn_dists[:, 0]

    # Local density score: relative inverse distance with numerical stabilizer
    eps = 1e-6
    raw_densities = 1.0 / (mean_knn_dists + eps)

    min_density = float(np.min(raw_densities))
    max_density = float(np.max(raw_densities))
    density_range = max_density - min_density

    if density_range > 1e-8:
        density_scores = ((raw_densities - min_density) / density_range) * 100.0
    else:
        density_scores = np.full(n, 50.0, dtype=np.float64)

    knn_dist_stats = compute_distribution_stats(mean_knn_dists)
    knn_dist_hist = compute_histogram(mean_knn_dists, num_bins=25)

    density_stats = compute_distribution_stats(density_scores)
    density_hist = compute_histogram(density_scores, num_bins=25)

    # Construct per-vector density records
    all_vector_infos = [
        VectorDensityInfo(
            id=batch.valid_ids[i],
            mean_knn_distance=float(mean_knn_dists[i]),
            median_knn_distance=float(median_knn_dists[i]),
            nearest_neighbor_distance=float(nn1_dists[i]),
            local_density_score=float(density_scores[i]),
            document=batch.valid_documents[i],
            metadata=batch.valid_metadatas[i],
        )
        for i in range(n)
    ]

    # Rank densest and sparsest
    sorted_by_density = sorted(all_vector_infos, key=lambda x: x.local_density_score, reverse=True)
    densest = sorted_by_density[:10]
    sparsest = list(reversed(sorted_by_density[-10:]))

    interpretation = (
        f"Computed {k}-nearest neighbor graph in original {distance_metric} space across {n:,} vectors. "
        f"Mean neighborhood distance is {knn_dist_stats.mean:.4f} (median: {knn_dist_stats.median:.4f}, "
        f"P95: {knn_dist_stats.p95:.4f}). High density scores indicate vectors situated in dense core clusters, "
        "while low scores designate isolated peripheral vectors."
    )

    return KnnDensityResult(
        k=k,
        distance_metric=distance_metric,
        knn_distance_distribution=knn_dist_stats,
        knn_distance_histogram=knn_dist_hist,
        local_density_distribution=density_stats,
        local_density_histogram=density_hist,
        densest_vectors=densest,
        sparsest_vectors=sparsest,
        interpretation=interpretation,
    )


def get_vector_neighbors(
    batch: ExtractedVectorBatch,
    target_vector_id: str,
    k: int = 15,
) -> list[NeighborInfo]:
    """
    Retrieve nearest neighbors for an individual vector in the original embedding space.
    """
    n = batch.sample_size
    if n < 2 or target_vector_id not in batch.valid_ids:
        return []

    target_idx = batch.valid_ids.index(target_vector_id)
    target_emb = batch.valid_embeddings[target_idx : target_idx + 1]

    effective_k = min(max(1, k), n - 1)
    sklearn_metric = "cosine" if batch.distance_metric == "cosine" else "euclidean"

    nn = NearestNeighbors(n_neighbors=effective_k + 1, metric=sklearn_metric, algorithm="auto")
    nn.fit(batch.valid_embeddings)

    distances, indices = nn.kneighbors(target_emb, n_neighbors=effective_k + 1)

    neighbor_infos: list[NeighborInfo] = []
    rank = 1
    for dist, idx in zip(distances[0], indices[0]):
        if idx == target_idx:
            continue  # skip self
        neighbor_id = batch.valid_ids[idx]
        sim = 1.0 - float(dist) if batch.distance_metric == "cosine" else -float(dist)
        neighbor_infos.append(
            NeighborInfo(
                id=neighbor_id,
                rank=rank,
                distance=float(dist),
                similarity=float(sim),
                document=batch.valid_documents[idx],
                metadata=batch.valid_metadatas[idx],
            )
        )
        rank += 1

    return neighbor_infos
