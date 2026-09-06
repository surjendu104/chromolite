from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from collections.abc import Callable
from typing import Any

from chromadb.api.models.Collection import Collection

from chromolite.analysis.extractor import (
    ExtractedVectorBatch,
    extract_vector_batch,
)
from chromolite.analysis.models import (
    AnalysisMethod,
    AnalysisResponse,
    AnalysisStatus,
    CollectionHealthResult,
    KnnDensityResult,
    MetricDefinition,
    NeighborInfo,
    OutlierDetectionResult,
    ProjectionResult,
    SamplingConfig,
    SimilarityDistributionResult,
)
from chromolite.analysis.neighbors import (
    compute_knn_and_density,
    get_vector_neighbors,
)
from chromolite.analysis.outliers import compute_outliers
from chromolite.analysis.projection import compute_projection
from chromolite.analysis.similarity import compute_similarity_distribution
from chromolite.analysis.statistics import compute_collection_health
from chromolite.connection import db

logger = logging.getLogger(__name__)


class CacheEntry:
    def __init__(self, collection_id: str, data: Any, timestamp: float) -> None:
        self.collection_id = collection_id
        self.data = data
        self.timestamp = timestamp


class InMemoryAnalysisCache:
    """Thread-safe LRU cache for expensive analytical computations."""

    def __init__(self, max_entries: int = 100, ttl_seconds: float = 3600.0) -> None:
        self._cache: dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
        self._max_entries = max_entries
        self._ttl_seconds = ttl_seconds

    def make_key(
        self,
        collection_id: str,
        collection_count: int,
        metric_id: str,
        parameters: dict[str, Any],
    ) -> str:
        serialized_params = json.dumps(parameters, sort_keys=True, default=str)
        raw_key = f"{collection_id}:{collection_count}:{metric_id}:{serialized_params}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            if time.time() - entry.timestamp > self._ttl_seconds:
                del self._cache[key]
                return None
            return entry.data

    def set(self, key: str, collection_id: str, value: Any) -> None:
        with self._lock:
            if len(self._cache) >= self._max_entries:
                # Evict oldest entry
                oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k].timestamp)
                del self._cache[oldest_key]
            self._cache[key] = CacheEntry(collection_id, value, time.time())

    def invalidate_collection(self, collection_id: str) -> None:
        with self._lock:
            keys_to_del = [
                k for k, entry in self._cache.items() if entry.collection_id == collection_id
            ]
            for k in keys_to_del:
                del self._cache[k]

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


class AnalysisService:
    """Central analysis service orchestrating data extraction, caching, and execution."""

    def __init__(self) -> None:
        self.cache = InMemoryAnalysisCache()
        self.registry: dict[str, MetricDefinition] = {}
        self._register_core_metrics()

    def _register_core_metrics(self) -> None:
        self.register_metric(
            MetricDefinition(
                id="collection_summary",
                name="Collection Summary & Schema",
                description="High-level structure, vector count, distance metric, and metadata types.",
                interpretation="Fundamental schema diagnostics for the ChromaDB collection.",
            )
        )
        self.register_metric(
            MetricDefinition(
                id="collection_health",
                name="Collection Health & Norm Distribution",
                description="Vector norm statistics (L2 magnitude percentiles, std, unit-normalization status) and validation flags.",
                formula="||v||_2 = sqrt(sum(v_i^2))",
                interpretation="Verifies whether vectors are unit-normalized (typical for cosine space) and isolates corrupt or zero vectors.",
                range_min=0.0,
            )
        )
        self.register_metric(
            MetricDefinition(
                id="similarity_distribution",
                name="Pairwise & Local Similarity Distribution",
                description="Sampled pairwise cosine similarity percentiles, histogram, anisotropy indicator, and 1-NN similarity.",
                formula="cos(u, v) = (u . v) / (||u||_2 * ||v||_2)",
                interpretation="Assesses global vector dispersion and identifies potential anisotropy/cone effect where mean similarity exceeds 0.70.",
                range_min=-1.0,
                range_max=1.0,
            )
        )
        self.register_metric(
            MetricDefinition(
                id="projection_2d",
                name="2D Embedding Projection",
                description="2D dimensionality reduction via deterministic PCA baseline, non-linear UMAP, and t-SNE.",
                formula="PCA: max Var(X w_1), UMAP: min D_KL(P || Q)",
                interpretation="Visualizes embedding space topology and manifold structure. 2D distances are visual approximations.",
            )
        )
        self.register_metric(
            MetricDefinition(
                id="knn_density",
                name="kNN & Local Density Analysis",
                description="k-Nearest Neighbor distance distribution and relative local density estimation in high-dimensional space.",
                formula="density(x) = 1 / (mean(d(x, kNN(x))) + eps)",
                interpretation="Characterizes local neighborhood tightness and isolates peripheral vectors from core clusters.",
                range_min=0.0,
                range_max=100.0,
            )
        )
        self.register_metric(
            MetricDefinition(
                id="outlier_detection",
                name="Outlier & Anomaly Detection",
                description="Identifies unusually isolated vectors relative to local neighborhoods via kNN distance and Local Outlier Factor (LOF).",
                formula="LOF_k(p) = (sum lrd_k(o) / |N_k(p)|) / lrd_k(p)",
                interpretation="Detects peripheral vectors, corrupt embeddings, or anomalous data points exceeding specified quantile thresholds.",
            )
        )

    def get_projection(
        self,
        collection_name: str,
        parameters: dict[str, Any] | None = None,
        sampling: SamplingConfig | None = None,
    ) -> AnalysisResponse[ProjectionResult]:
        algo = parameters.get("algorithm", "pca") if parameters else "pca"
        return self.execute_analysis(
            collection_name=collection_name,
            metric_id=f"projection_{algo}",
            compute_fn=compute_projection,
            parameters=parameters,
            sampling=sampling,
        )

    def register_metric(self, metric: MetricDefinition) -> None:
        self.registry[metric.id] = metric

    def get_metric_definition(self, metric_id: str) -> MetricDefinition | None:
        return self.registry.get(metric_id)

    def get_collection(self, collection_name: str) -> Collection:
        client = db.get_client()
        return client.get_collection(name=collection_name)

    def get_knn_density(
        self,
        collection_name: str,
        k: int = 15,
        parameters: dict[str, Any] | None = None,
        sampling: SamplingConfig | None = None,
    ) -> AnalysisResponse[KnnDensityResult]:
        params = {**(parameters or {}), "k": k}
        return self.execute_analysis(
            collection_name=collection_name,
            metric_id=f"knn_density_k{k}",
            compute_fn=compute_knn_and_density,
            parameters=params,
            sampling=sampling,
        )

    def get_outliers(
        self,
        collection_name: str,
        method: str = "knn_distance",
        threshold_quantile: float = 0.01,
        k: int = 15,
        parameters: dict[str, Any] | None = None,
        sampling: SamplingConfig | None = None,
    ) -> AnalysisResponse[OutlierDetectionResult]:
        params = {
            **(parameters or {}),
            "method": method,
            "threshold_quantile": threshold_quantile,
            "k": k,
        }
        return self.execute_analysis(
            collection_name=collection_name,
            metric_id=f"outliers_{method}_q{threshold_quantile}_k{k}",
            compute_fn=compute_outliers,
            parameters=params,
            sampling=sampling,
        )

    def get_vector_neighbors(
        self,
        collection_name: str,
        vector_id: str,
        k: int = 15,
    ) -> list[NeighborInfo]:
        _, batch = self.extract_vectors(collection_name, sampling=SamplingConfig(max_samples=25000))
        return get_vector_neighbors(batch, vector_id, k=k)

    def get_collection_health(
        self,
        collection_name: str,
        parameters: dict[str, Any] | None = None,
        sampling: SamplingConfig | None = None,
    ) -> AnalysisResponse[CollectionHealthResult]:
        return self.execute_analysis(
            collection_name=collection_name,
            metric_id="collection_health",
            compute_fn=compute_collection_health,
            parameters=parameters,
            sampling=sampling,
        )

    def get_similarity_distribution(
        self,
        collection_name: str,
        parameters: dict[str, Any] | None = None,
        sampling: SamplingConfig | None = None,
    ) -> AnalysisResponse[SimilarityDistributionResult]:
        return self.execute_analysis(
            collection_name=collection_name,
            metric_id="similarity_distribution",
            compute_fn=compute_similarity_distribution,
            parameters=parameters,
            sampling=sampling,
        )

    def extract_vectors(
        self,
        collection_name: str,
        sampling: SamplingConfig | None = None,
    ) -> tuple[Collection, ExtractedVectorBatch]:
        collection = self.get_collection(collection_name)
        batch = extract_vector_batch(collection, sampling=sampling)
        return collection, batch

    def execute_analysis(
        self,
        collection_name: str,
        metric_id: str,
        compute_fn: Callable[[Collection, ExtractedVectorBatch, dict[str, Any]], Any],
        parameters: dict[str, Any] | None = None,
        sampling: SamplingConfig | None = None,
        use_cache: bool = True,
    ) -> AnalysisResponse[Any]:
        """
        Orchestrate an analytical computation with safe extraction, caching, and timing.
        """
        start_time = time.perf_counter()
        if parameters is None:
            parameters = {}
        if sampling is None:
            sampling = SamplingConfig()

        collection = self.get_collection(collection_name)
        total_count = collection.count()
        collection_id = str(collection.id)

        cache_params = {**parameters, "sampling": sampling.model_dump()}
        cache_key = self.cache.make_key(collection_id, total_count, metric_id, cache_params)

        if use_cache:
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                return cached_result

        batch = extract_vector_batch(collection, sampling=sampling)

        warnings: list[str] = []
        if batch.invalid_reasons:
            invalid_count = len(batch.invalid_reasons)
            reasons_summary = ", ".join(
                f"{k}: {v}" for k, v in list(batch.invalid_reasons.items())[:3]
            )
            if invalid_count > 3:
                reasons_summary += f", and {invalid_count - 3} more"
            warnings.append(
                f"{invalid_count} invalid vectors were excluded from analysis ({reasons_summary})."
            )

        if batch.sample_size == 0:
            resp: AnalysisResponse[Any] = AnalysisResponse(
                status=AnalysisStatus.EMPTY if total_count == 0 else AnalysisStatus.FAILED,
                metric_id=metric_id,
                computed_on=0,
                total_vectors=total_count,
                method=AnalysisMethod.UNAVAILABLE,
                approximate=False,
                parameters=parameters,
                result=None,
                execution_time_ms=(time.perf_counter() - start_time) * 1000.0,
                warnings=warnings,
                unavailable_reason="Collection has no valid vectors to analyze.",
            )
            return resp

        method = AnalysisMethod.SAMPLED if batch.sampled else AnalysisMethod.EXACT
        approx = batch.sampled

        result_data = compute_fn(collection, batch, parameters)
        exec_time = (time.perf_counter() - start_time) * 1000.0

        response: AnalysisResponse[Any] = AnalysisResponse(
            status=AnalysisStatus.COMPLETED,
            metric_id=metric_id,
            computed_on=batch.sample_size,
            total_vectors=total_count,
            method=method,
            approximate=approx,
            parameters=parameters,
            result=result_data,
            execution_time_ms=exec_time,
            warnings=warnings,
        )

        if use_cache:
            self.cache.set(cache_key, collection_id, response)

        return response


analysis_service = AnalysisService()
