from __future__ import annotations

from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection

from chromolite.analysis.extractor import ExtractedVectorBatch
from chromolite.analysis.models import (
    CollectionHealthResult,
    DistributionStats,
    HistogramData,
)


def compute_distribution_stats(values: np.ndarray) -> DistributionStats:
    """Calculate exact descriptive distribution percentiles, mean, and std."""
    if values.size == 0:
        return DistributionStats(
            min=0.0,
            p01=0.0,
            p05=0.0,
            p25=0.0,
            median=0.0,
            p75=0.0,
            p95=0.0,
            p99=0.0,
            max=0.0,
            mean=0.0,
            std=0.0,
        )

    clean_vals = np.asarray(values, dtype=np.float64)
    # Ensure numerical safety
    clean_vals = clean_vals[np.isfinite(clean_vals)]
    if clean_vals.size == 0:
        return DistributionStats(
            min=0.0,
            p01=0.0,
            p05=0.0,
            p25=0.0,
            median=0.0,
            p75=0.0,
            p95=0.0,
            p99=0.0,
            max=0.0,
            mean=0.0,
            std=0.0,
        )

    percentiles = np.percentile(clean_vals, [1, 5, 25, 50, 75, 95, 99])

    return DistributionStats(
        min=float(np.min(clean_vals)),
        p01=float(percentiles[0]),
        p05=float(percentiles[1]),
        p25=float(percentiles[2]),
        median=float(percentiles[3]),
        p75=float(percentiles[4]),
        p95=float(percentiles[5]),
        p99=float(percentiles[6]),
        max=float(np.max(clean_vals)),
        mean=float(np.mean(clean_vals)),
        std=float(np.std(clean_vals)),
    )


def compute_histogram(values: np.ndarray, num_bins: int = 25) -> HistogramData:
    """Construct histogram bins and counts for distribution visualization."""
    if values.size == 0:
        return HistogramData(bins=[0.0, 1.0], counts=[0], bin_centers=[0.5])

    clean_vals = np.asarray(values, dtype=np.float64)
    clean_vals = clean_vals[np.isfinite(clean_vals)]

    if clean_vals.size == 0:
        return HistogramData(bins=[0.0, 1.0], counts=[0], bin_centers=[0.5])

    v_min = float(np.min(clean_vals))
    v_max = float(np.max(clean_vals))

    if np.isclose(v_min, v_max, atol=1e-8):
        # Degenerate single-value distribution
        bins = [v_min - 0.01, v_max + 0.01]
        counts = [len(clean_vals)]
        centers = [float((bins[0] + bins[1]) / 2.0)]
        return HistogramData(bins=bins, counts=counts, bin_centers=centers)

    counts, bin_edges = np.histogram(clean_vals, bins=num_bins)
    centers = [(float(bin_edges[i]) + float(bin_edges[i + 1])) / 2.0 for i in range(len(counts))]

    return HistogramData(
        bins=[float(b) for b in bin_edges],
        counts=[int(c) for c in counts],
        bin_centers=centers,
    )


def compute_collection_health(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> CollectionHealthResult:
    """
    Compute embedding norm statistics and collection health indicators per Phase 1.
    """
    total_vectors = batch.total_in_collection
    distance_metric = batch.distance_metric

    if batch.sample_size == 0 or batch.valid_embeddings.shape[0] == 0:
        empty_stats = compute_distribution_stats(np.array([]))
        empty_hist = compute_histogram(np.array([]))
        return CollectionHealthResult(
            vector_count=total_vectors,
            dimension=batch.dimension,
            distance_metric=distance_metric,
            is_unit_normalized=False,
            norms=empty_stats,
            norm_histogram=empty_hist,
            zero_vector_count=len([v for v in batch.invalid_reasons.values() if "zero_vector" in v]),
            invalid_vector_count=len(batch.invalid_reasons),
            health_status="empty" if total_vectors == 0 else "critical",
            anomalies=["Collection contains no valid embeddings for norm evaluation."],
        )

    # Compute Euclidean (L2) norms
    norms = np.linalg.norm(batch.valid_embeddings, axis=1)

    norm_stats = compute_distribution_stats(norms)
    norm_hist = compute_histogram(norms, num_bins=parameters.get("num_bins", 25) if parameters else 25)

    # Unit normalization check: are >= 98% of vectors within [1 - tol, 1 + tol]
    tolerance = parameters.get("tolerance", 0.01) if parameters else 0.01
    unit_norm_fraction = float(np.mean(np.abs(norms - 1.0) <= tolerance))
    is_unit_normalized = unit_norm_fraction >= 0.98

    anomalies: list[str] = []
    zero_vectors = len([v for v in batch.invalid_reasons.values() if "zero_vector" in v])
    invalid_vectors = len(batch.invalid_reasons)

    if invalid_vectors > 0:
        anomalies.append(
            f"{invalid_vectors} malformed or invalid vectors detected in collection."
        )

    if zero_vectors > 0:
        anomalies.append(
            f"{zero_vectors} zero-norm vectors detected (magnitude < 1e-12)."
        )

    if distance_metric == "cosine" and not is_unit_normalized and norm_stats.std > 0.1:
        anomalies.append(
            f"Collection is configured with cosine distance, but vector norms vary (mean={norm_stats.mean:.3f}, std={norm_stats.std:.3f})."
        )

    # Health status determination
    if invalid_vectors > (0.05 * total_vectors) or (total_vectors > 0 and batch.sample_size == 0):
        health_status = "critical"
    elif anomalies:
        health_status = "warning"
    else:
        health_status = "healthy"

    return CollectionHealthResult(
        vector_count=total_vectors,
        dimension=batch.dimension,
        distance_metric=distance_metric,
        is_unit_normalized=is_unit_normalized,
        unit_norm_tolerance=tolerance,
        norms=norm_stats,
        norm_histogram=norm_hist,
        zero_vector_count=zero_vectors,
        invalid_vector_count=invalid_vectors,
        health_status=health_status,
        anomalies=anomalies,
    )
