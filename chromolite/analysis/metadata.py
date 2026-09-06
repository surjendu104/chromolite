from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import UTC, datetime
from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection
from scipy.stats import pearsonr
from sklearn.cluster import MiniBatchKMeans
from sklearn.metrics import normalized_mutual_info_score
from sklearn.metrics.pairwise import euclidean_distances

from chromolite.analysis.extractor import ExtractedVectorBatch
from chromolite.analysis.models import (
    CategoryStats,
    MetadataAnalysisResult,
    NumericFieldStats,
    TemporalDriftResult,
    TimeWindowStats,
)
from chromolite.analysis.statistics import compute_distribution_stats

logger = logging.getLogger(__name__)


def parse_timestamp_value(val: Any) -> datetime | None:
    """Safely parse diverse timestamp representations (ISO string, epoch int/float, datetime)."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, (int, float)):
        # Check if seconds or milliseconds
        if val > 1e11:
            val = val / 1000.0
        try:
            return datetime.fromtimestamp(val, tz=UTC)
        except (ValueError, OSError):
            return None
    if isinstance(val, str):
        val_str = val.strip()
        # ISO formats
        # ISO format parsing
        try:
            dt = datetime.fromisoformat(val_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return dt
        except ValueError:
            pass

        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%Y-%m",
        ):
            try:
                dt = datetime.strptime(val_str[:19], fmt).replace(tzinfo=UTC)
                return dt
            except ValueError:
                continue
    return None


def get_time_window_key(dt: datetime, granularity: str = "month") -> str:
    """Format datetime into consistent temporal window bucket string."""
    gran = granularity.lower()
    if gran == "day":
        return dt.strftime("%Y-%m-%d")
    elif gran == "week":
        return f"{dt.year}-W{dt.isocalendar()[1]:02d}"
    elif gran == "quarter":
        quarter = (dt.month - 1) // 3 + 1
        return f"{dt.year}-Q{quarter}"
    elif gran == "year":
        return f"{dt.year}"
    else:  # month default
        return dt.strftime("%Y-%m")


def compute_metadata_analysis(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> MetadataAnalysisResult:
    """
    Evaluate category dispersion, cluster purity, mutual information, or numeric correlation per Phase 10.
    """
    if parameters is None:
        parameters = {}

    field_name = str(parameters.get("field_name", "")).strip()
    n = batch.sample_size
    distance_metric = batch.distance_metric

    if n < 2 or not field_name:
        return MetadataAnalysisResult(
            field_name=field_name,
            field_type="categorical",
            total_vectors_with_field=0,
            coverage_rate=0.0,
            unique_values_count=0,
            categories=[],
            cluster_purity=0.0,
            normalized_mutual_information=0.0,
            numeric_stats=None,
            interpretation="Field not specified or insufficient vectors.",
        )

    # Extract field values and indices
    present_indices = []
    raw_values = []

    for i, meta in enumerate(batch.valid_metadatas):
        if meta and field_name in meta and meta[field_name] is not None:
            present_indices.append(i)
            raw_values.append(meta[field_name])

    count_present = len(present_indices)
    coverage = float(count_present / n) if n > 0 else 0.0

    if count_present == 0:
        return MetadataAnalysisResult(
            field_name=field_name,
            field_type="categorical",
            total_vectors_with_field=0,
            coverage_rate=0.0,
            unique_values_count=0,
            categories=[],
            cluster_purity=None,
            normalized_mutual_information=None,
            numeric_stats=None,
            interpretation=f"No vectors contain non-null values for metadata field '{field_name}'.",
        )

    # Determine if field is numeric
    is_numeric = all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in raw_values)

    # Unit normalize embeddings if cosine space
    if distance_metric == "cosine":
        norms = np.linalg.norm(batch.valid_embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        embs = (batch.valid_embeddings / norms).astype(np.float32)
    else:
        embs = batch.valid_embeddings

    sub_embs = embs[present_indices]
    raw_norms = np.linalg.norm(batch.valid_embeddings[present_indices], axis=1)

    if is_numeric:
        num_arr = np.asarray(raw_values, dtype=np.float64)
        num_stats = compute_distribution_stats(num_arr)

        norm_corr = None
        if len(num_arr) > 2 and np.std(num_arr) > 1e-8 and np.std(raw_norms) > 1e-8:
            try:
                corr, _ = pearsonr(num_arr, raw_norms)
                norm_corr = float(corr) if np.isfinite(corr) else None
            except (ValueError, TypeError, FloatingPointError):
                norm_corr = None

        unique_cnt = len(set(raw_values))

        interp = (
            f"Numeric field '{field_name}' is present on {count_present:,} vectors ({coverage * 100:.1f}% coverage). "
            f"Mean: {num_stats.mean:.3f}, Median: {num_stats.median:.3f}, Std: {num_stats.std:.3f}. "
            + (f"Pearson correlation with vector norm is {norm_corr:.3f}." if norm_corr is not None else "")
        )

        return MetadataAnalysisResult(
            field_name=field_name,
            field_type="numeric",
            total_vectors_with_field=count_present,
            coverage_rate=coverage,
            unique_values_count=unique_cnt,
            categories=None,
            cluster_purity=None,
            normalized_mutual_information=None,
            numeric_stats=NumericFieldStats(
                name=field_name,
                stats=num_stats,
                norm_correlation=norm_corr,
                density_correlation=None,
            ),
            interpretation=interp,
        )

    # Categorical field analysis
    str_values = [str(v) for v in raw_values]
    val_counts = Counter(str_values)
    unique_cnt = len(val_counts)

    # Group categories (top 12 + Other)
    top_categories = val_counts.most_common(12)
    top_cat_names = {k for k, _ in top_categories}

    cat_indices: dict[str, list[int]] = defaultdict(list)
    for i, val_s in enumerate(str_values):
        cat_key = val_s if val_s in top_cat_names else "Other"
        cat_indices[cat_key].append(i)

    category_stats_list: list[CategoryStats] = []

    for cat_name, idx_list in sorted(cat_indices.items(), key=lambda x: len(x[1]), reverse=True):
        c_count = len(idx_list)
        c_embs = sub_embs[idx_list]
        c_centroid = np.mean(c_embs, axis=0, keepdims=True)
        intra_dists = euclidean_distances(c_embs, c_centroid).flatten()
        mean_intra_dist = float(np.mean(intra_dists))
        mean_norm_cat = float(np.mean(raw_norms[idx_list]))

        category_stats_list.append(
            CategoryStats(
                name=cat_name,
                count=c_count,
                percentage=float((c_count / count_present) * 100.0),
                mean_distance_to_centroid=mean_intra_dist,
                norm_mean=mean_norm_cat,
            )
        )

    # Fast clustering to compute purity and NMI
    k_clusters = min(8, count_present)
    purity: float | None = None
    nmi: float | None = None

    if k_clusters >= 2 and len(unique_cnt > 1 if isinstance(unique_cnt, bool) else [1]) > 0 and unique_cnt > 1:
        try:
            kmeans = MiniBatchKMeans(n_clusters=k_clusters, random_state=42, batch_size=min(512, count_present))
            cluster_labels = kmeans.fit_predict(sub_embs)

            # Cluster purity = (1/N) * sum_k max_c |C_k cap S_c|
            purity_sum = 0
            for k_id in range(k_clusters):
                k_mask = cluster_labels == k_id
                if np.sum(k_mask) > 0:
                    k_cats = [str_values[idx] for idx in range(count_present) if k_mask[idx]]
                    purity_sum += Counter(k_cats).most_common(1)[0][1]
            purity = float(purity_sum / count_present)

            # Normalized Mutual Information
            nmi = float(normalized_mutual_info_score(str_values, cluster_labels))
        except (ValueError, TypeError, RuntimeError) as exc:
            logger.debug(f"Purity calculation exception: {exc}")

    interp = (
        f"Categorical field '{field_name}' covers {count_present:,} vectors ({coverage * 100:.1f}% coverage) "
        f"across {unique_cnt} distinct categories. "
        + (f"Cluster Purity is {purity * 100:.1f}% and Normalized Mutual Information (NMI) is {nmi:.3f}, "
           f"reflecting {'strong' if (nmi or 0) > 0.4 else 'moderate' if (nmi or 0) > 0.15 else 'low'} "
           "alignment between metadata categories and vector space geometry."
           if purity is not None and nmi is not None
           else "")
    )

    return MetadataAnalysisResult(
        field_name=field_name,
        field_type="categorical",
        total_vectors_with_field=count_present,
        coverage_rate=coverage,
        unique_values_count=unique_cnt,
        categories=category_stats_list,
        cluster_purity=purity,
        normalized_mutual_information=nmi,
        numeric_stats=None,
        interpretation=interp,
    )


def compute_temporal_drift(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> TemporalDriftResult:
    """
    Evaluate temporal centroid drift and vector dynamics across time windows per Phase 11.
    """
    if parameters is None:
        parameters = {}

    timestamp_field = parameters.get("timestamp_field")
    granularity = str(parameters.get("granularity", "month")).lower()
    distance_metric = batch.distance_metric

    # Auto-detect timestamp field if not specified
    if not timestamp_field:
        candidate_fields = ("created_at", "timestamp", "date", "time", "updated_at", "year")
        for f in candidate_fields:
            if batch.valid_metadatas and any(m and f in m for m in batch.valid_metadatas):
                timestamp_field = f
                break

    if not timestamp_field:
        return TemporalDriftResult(
            timestamp_field="none",
            granularity=granularity,
            total_windows=0,
            windows=[],
            mean_consecutive_drift=0.0,
            max_drift_window=None,
            max_drift_value=None,
            interpretation="No timestamp or date metadata field discovered in collection records.",
        )

    # Group vectors by parsed time window
    window_groups: dict[str, list[int]] = defaultdict(list)
    window_timestamps: dict[str, list[datetime]] = defaultdict(list)

    for i, meta in enumerate(batch.valid_metadatas):
        if meta and timestamp_field in meta:
            parsed_dt = parse_timestamp_value(meta[timestamp_field])
            if parsed_dt:
                key = get_time_window_key(parsed_dt, granularity)
                window_groups[key].append(i)
                window_timestamps[key].append(parsed_dt)

    if len(window_groups) == 0:
        return TemporalDriftResult(
            timestamp_field=timestamp_field,
            granularity=granularity,
            total_windows=0,
            windows=[],
            mean_consecutive_drift=0.0,
            max_drift_window=None,
            max_drift_value=None,
            interpretation=f"Could not parse valid temporal timestamps from field '{timestamp_field}'.",
        )

    # Sort windows chronologically
    sorted_window_keys = sorted(window_groups.keys())

    # Unit-normalize embeddings if cosine space
    if distance_metric == "cosine":
        norms = np.linalg.norm(batch.valid_embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        embs = (batch.valid_embeddings / norms).astype(np.float32)
    else:
        embs = batch.valid_embeddings

    raw_norms = np.linalg.norm(batch.valid_embeddings, axis=1)

    window_stats_list: list[TimeWindowStats] = []
    previous_centroid: np.ndarray | None = None
    drift_values: list[float] = []

    for w_key in sorted_window_keys:
        indices = window_groups[w_key]
        dts = window_timestamps[w_key]
        w_count = len(indices)

        w_embs = embs[indices]
        centroid = np.mean(w_embs, axis=0, keepdims=True)

        drift: float | None = None
        if previous_centroid is not None:
            if distance_metric == "cosine":
                # Cosine distance between consecutive centroids
                sim = float(np.dot(previous_centroid[0], centroid[0]) / (np.linalg.norm(previous_centroid[0]) * np.linalg.norm(centroid[0]) + 1e-12))
                drift = float(max(0.0, 1.0 - sim))
            else:
                drift = float(np.linalg.norm(previous_centroid - centroid))
            drift_values.append(drift)

        previous_centroid = centroid

        mean_norm = float(np.mean(raw_norms[indices]))

        min_dt = min(dts).isoformat()[:10]
        max_dt = max(dts).isoformat()[:10]

        window_stats_list.append(
            TimeWindowStats(
                window_label=w_key,
                start_time=min_dt,
                end_time=max_dt,
                vector_count=w_count,
                centroid_drift_from_previous=drift,
                mean_norm=mean_norm,
                mean_internal_similarity=None,
            )
        )

    mean_drift = float(np.mean(drift_values)) if drift_values else 0.0

    max_drift_val = None
    max_drift_win = None
    if drift_values:
        max_idx = int(np.argmax(drift_values))
        max_drift_val = float(drift_values[max_idx])
        # max_idx corresponds to window index max_idx + 1
        max_drift_win = sorted_window_keys[max_idx + 1]

    interp = (
        f"Evaluated temporal dynamics across {len(window_stats_list)} {granularity} windows using timestamp field '{timestamp_field}'. "
        f"Mean consecutive centroid drift is {mean_drift:.4f}. "
        + (f"Largest observed drift occurred in window '{max_drift_win}' with a magnitude of {max_drift_val:.4f}."
           if max_drift_win is not None
           else "")
    )

    return TemporalDriftResult(
        timestamp_field=timestamp_field,
        granularity=granularity,
        total_windows=len(window_stats_list),
        windows=window_stats_list,
        mean_consecutive_drift=mean_drift,
        max_drift_window=max_drift_win,
        max_drift_value=max_drift_val,
        interpretation=interp,
    )
