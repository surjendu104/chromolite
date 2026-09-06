from __future__ import annotations

import logging
from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection
from sklearn.neighbors import LocalOutlierFactor, NearestNeighbors

from chromolite.analysis.extractor import ExtractedVectorBatch
from chromolite.analysis.models import (
    OutlierDetectionResult,
    OutlierVector,
)
from chromolite.analysis.statistics import (
    compute_distribution_stats,
    compute_histogram,
)

logger = logging.getLogger(__name__)


def compute_outliers(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> OutlierDetectionResult:
    """
    Detect unusually isolated vectors using kNN distance or Local Outlier Factor (LOF) per Phase 6.
    """
    if parameters is None:
        parameters = {}

    method = str(parameters.get("method", "knn_distance")).lower()
    if method not in ("knn_distance", "lof"):
        method = "knn_distance"

    threshold_quantile = float(parameters.get("threshold_quantile", 0.01))
    threshold_quantile = min(max(0.001, threshold_quantile), 0.20)  # Bound to [0.1%, 20%]

    req_k = int(parameters.get("k", 15))
    n = batch.sample_size
    distance_metric = batch.distance_metric

    if n < 3:
        empty_stats = compute_distribution_stats(np.array([]))
        empty_hist = compute_histogram(np.array([]))
        return OutlierDetectionResult(
            method=method,
            k=req_k,
            threshold_quantile=threshold_quantile,
            cutoff_score=0.0,
            outlier_score_distribution=empty_stats,
            outlier_score_histogram=empty_hist,
            outliers=[],
            outliers_count=0,
            outlier_rate=0.0,
            interpretation="Collection requires at least 3 vectors to perform outlier detection.",
        )

    k = min(max(2, req_k), n - 1)
    sklearn_metric = "cosine" if distance_metric == "cosine" else "euclidean"
    norms = np.linalg.norm(batch.valid_embeddings, axis=1)

    # Compute kNN distances
    nn = NearestNeighbors(n_neighbors=k + 1, metric=sklearn_metric, algorithm="auto")
    nn.fit(batch.valid_embeddings)
    distances, _ = nn.kneighbors(batch.valid_embeddings, n_neighbors=k + 1)
    knn_dists = distances[:, 1:]  # shape (N, K)
    mean_knn_dists = np.mean(knn_dists, axis=1)
    median_knn_dist = float(np.median(mean_knn_dists))

    # Calculate local density score for each vector
    eps = 1e-6
    raw_densities = 1.0 / (mean_knn_dists + eps)
    min_dens = float(np.min(raw_densities))
    max_dens = float(np.max(raw_densities))
    dens_range = max_dens - min_dens
    if dens_range > 1e-8:
        density_scores = ((raw_densities - min_dens) / dens_range) * 100.0
    else:
        density_scores = np.full(n, 50.0, dtype=np.float64)

    lof_scores: np.ndarray | None = None

    if method == "lof":
        try:
            lof = LocalOutlierFactor(n_neighbors=k, metric=sklearn_metric)
            lof.fit(batch.valid_embeddings)
            lof_scores = -lof.negative_outlier_factor_  # inliers ~ 1.0, outliers > 1.5
            scores = lof_scores
        except (ValueError, RuntimeError, TypeError) as exc:
            logger.warning(f"LOF computation failed ({exc}), falling back to kNN distance.")
            method = "knn_distance"
            scores = mean_knn_dists
    else:
        scores = mean_knn_dists

    score_stats = compute_distribution_stats(scores)
    score_hist = compute_histogram(scores, num_bins=25)

    # Cutoff threshold at requested quantile (e.g. 99th percentile for Top 1%)
    cutoff_percentile = (1.0 - threshold_quantile) * 100.0
    cutoff_val = float(np.percentile(scores, cutoff_percentile))

    # Isolation factor: ratio of vector's mean kNN distance to collection median kNN distance
    isolation_factors = mean_knn_dists / (median_knn_dist + eps)

    # Identify outlier vectors
    outlier_indices = np.where(scores >= cutoff_val)[0]

    outlier_vectors: list[OutlierVector] = []
    for idx in outlier_indices:
        outlier_vectors.append(
            OutlierVector(
                id=batch.valid_ids[idx],
                outlier_score=float(scores[idx]),
                lof_score=float(lof_scores[idx]) if lof_scores is not None else None,
                mean_knn_distance=float(mean_knn_dists[idx]),
                local_density_score=float(density_scores[idx]),
                norm=float(norms[idx]),
                document=batch.valid_documents[idx],
                metadata=batch.valid_metadatas[idx],
                isolation_factor=float(isolation_factors[idx]),
            )
        )

    # Sort outliers descending by score
    outlier_vectors.sort(key=lambda x: x.outlier_score, reverse=True)
    outlier_count = len(outlier_vectors)
    outlier_rate = float(outlier_count / n)

    pct_label = f"{threshold_quantile * 100:.1f}%"
    interpretation = (
        f"Evaluated {n:,} vectors using {method.upper()} (k={k}). Identified {outlier_count} unusually "
        f"isolated vectors ({outlier_rate * 100:.2f}% of collection) exceeding the {pct_label} quantile "
        f"cutoff ({cutoff_val:.4f}). Outlier vectors exhibit an average neighborhood isolation factor of "
        f"{(np.mean([o.isolation_factor for o in outlier_vectors]) if outlier_vectors else 1.0):.2f}x "
        "relative to the collection median."
    )

    return OutlierDetectionResult(
        method=method,
        k=k,
        threshold_quantile=threshold_quantile,
        cutoff_score=cutoff_val,
        outlier_score_distribution=score_stats,
        outlier_score_histogram=score_hist,
        outliers=outlier_vectors,
        outliers_count=outlier_count,
        outlier_rate=outlier_rate,
        interpretation=interpretation,
    )
