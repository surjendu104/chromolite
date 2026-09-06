from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AnalysisMethod(str, Enum):
    EXACT = "exact"
    SAMPLED = "sampled"
    APPROXIMATE = "approximate"
    ESTIMATED = "estimated"
    UNAVAILABLE = "unavailable"


class MetricDefinition(BaseModel):
    id: str
    name: str
    description: str
    formula: str | None = None
    interpretation: str | None = None
    range_min: float | None = None
    range_max: float | None = None
    unit: str | None = None
    higher_is_better: bool | None = None


class SamplingStrategy(str, Enum):
    ALL = "all"
    RANDOM = "random"
    STRATIFIED = "stratified"
    CLUSTER_AWARE = "cluster_aware"


class SamplingConfig(BaseModel):
    strategy: SamplingStrategy = SamplingStrategy.RANDOM
    max_samples: int = Field(
        default=10000,
        ge=1,
        description="Maximum number of vectors to sample for analysis.",
    )
    random_seed: int = Field(
        default=42,
        description="Deterministic random seed for reproducible sampling.",
    )


class AnalysisStatus(str, Enum):
    COMPLETED = "completed"
    PARTIAL = "partial"
    EMPTY = "empty"
    FAILED = "failed"
    UNAVAILABLE = "unavailable"


class AnalysisResponse[T](BaseModel):
    """Standardized envelope for all analytical endpoints per AGENTS.md."""

    status: AnalysisStatus = AnalysisStatus.COMPLETED
    metric_id: str
    computed_on: int = Field(
        description="Number of valid vectors included in computation."
    )
    total_vectors: int = Field(
        description="Total vector count present in collection."
    )
    method: AnalysisMethod = AnalysisMethod.EXACT
    approximate: bool = False
    parameters: dict[str, Any] = Field(default_factory=dict)
    result: T
    execution_time_ms: float = 0.0
    warnings: list[str] = Field(default_factory=list)
    unavailable_reason: str | None = None


class IndexInformation(BaseModel):
    space: str = "cosine"
    ef_construction: int | None = None
    ef_search: int | None = None
    max_neighbors: int | None = None
    resize_factor: float | None = None
    sync_threshold: int | None = None
    raw_configuration: dict[str, Any] = Field(default_factory=dict)


class MetadataFieldSummary(BaseModel):
    name: str
    data_type: str
    sample_values: list[Any] = Field(default_factory=list)
    unique_count: int | None = None
    null_count: int = 0
    is_high_cardinality: bool = False


class CollectionSummary(BaseModel):
    """Clean internal representation of a vector collection per Phase 0 spec."""

    id: str
    name: str
    vector_count: int
    dimension: int | None = None
    distance_metric: str = "cosine"
    database: str = "default_database"
    tenant: str = "default_tenant"
    metadata_fields: list[MetadataFieldSummary] = Field(default_factory=list)
    index_information: IndexInformation = Field(default_factory=IndexInformation)
    collection_metadata: dict[str, Any] = Field(default_factory=dict)


class DistributionStats(BaseModel):
    """Rigorous descriptive statistics for continuous numerical metrics."""

    min: float
    p01: float
    p05: float
    p25: float
    median: float
    p75: float
    p95: float
    p99: float
    max: float
    mean: float
    std: float


class HistogramData(BaseModel):
    """Histogram representation for visual distribution plotting."""

    bins: list[float] = Field(description="Bin edges, length K+1")
    counts: list[int] = Field(description="Bin frequencies, length K")
    bin_centers: list[float] = Field(description="Midpoints of bins, length K")


class CollectionHealthResult(BaseModel):
    """Comprehensive health & norm distribution metrics per Phase 1."""

    vector_count: int
    dimension: int | None = None
    distance_metric: str = "cosine"
    is_unit_normalized: bool = False
    unit_norm_tolerance: float = 0.01
    norms: DistributionStats
    norm_histogram: HistogramData
    zero_vector_count: int = 0
    invalid_vector_count: int = 0
    health_status: str = "healthy"  # "healthy", "warning", "critical", "empty"
    anomalies: list[str] = Field(default_factory=list)


class SimilarityDistributionResult(BaseModel):
    """Pairwise and kNN similarity distributions per Phase 2."""

    distance_metric: str = "cosine"
    pair_sample_count: int
    pairwise_similarity: DistributionStats
    similarity_histogram: HistogramData
    mean_pairwise_similarity: float
    is_potentially_anisotropic: bool = False
    anisotropy_interpretation: str
    nearest_neighbor_similarity: DistributionStats | None = None


class ProjectionPoint(BaseModel):
    """Single 2D projected embedding point for canvas visualization."""

    id: str
    x: float
    y: float
    document: str | None = None
    metadata: dict[str, Any] | None = None
    norm: float = 1.0


class ExplainedVariance(BaseModel):
    pc1: float
    pc2: float
    total: float


class ProjectionResult(BaseModel):
    """2D projection dataset per Phase 3 (PCA) and Phase 4 (UMAP/t-SNE)."""

    algorithm: str  # "pca", "umap", "tsne"
    points: list[ProjectionPoint]
    explained_variance: ExplainedVariance | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)
    distance_metric: str = "cosine"
    dimension: int | None = None


class NeighborInfo(BaseModel):
    """Nearest neighbor details in original embedding space."""

    id: str
    rank: int
    distance: float
    similarity: float
    document: str | None = None
    metadata: dict[str, Any] | None = None


class VectorDensityInfo(BaseModel):
    """Per-vector kNN distance & local density profile."""

    id: str
    mean_knn_distance: float
    median_knn_distance: float
    nearest_neighbor_distance: float
    local_density_score: float
    document: str | None = None
    metadata: dict[str, Any] | None = None


class KnnDensityResult(BaseModel):
    """High-dimensional kNN & local density distribution per Phase 5."""

    k: int
    distance_metric: str = "cosine"
    knn_distance_distribution: DistributionStats
    knn_distance_histogram: HistogramData
    local_density_distribution: DistributionStats
    local_density_histogram: HistogramData
    densest_vectors: list[VectorDensityInfo] = Field(default_factory=list)
    sparsest_vectors: list[VectorDensityInfo] = Field(default_factory=list)
    interpretation: str


class OutlierVector(BaseModel):
    """Vector flagged as unusually isolated relative to local neighborhood."""

    id: str
    outlier_score: float
    lof_score: float | None = None
    mean_knn_distance: float
    local_density_score: float
    norm: float
    document: str | None = None
    metadata: dict[str, Any] | None = None
    isolation_factor: float


class OutlierDetectionResult(BaseModel):
    """Collection-wide outlier & anomaly detection per Phase 6."""

    method: str  # "knn_distance", "lof"
    k: int
    threshold_quantile: float  # e.g. 0.01 (top 1%)
    cutoff_score: float
    outlier_score_distribution: DistributionStats
    outlier_score_histogram: HistogramData
    outliers: list[OutlierVector]
    outliers_count: int
    outlier_rate: float
    interpretation: str


class DuplicateMember(BaseModel):
    """Individual vector belonging to a duplicate/near-duplicate cluster."""

    id: str
    similarity_to_primary: float
    document: str | None = None
    metadata: dict[str, Any] | None = None
    norm: float = 1.0


class DuplicateGroup(BaseModel):
    """Cluster of redundant identical or near-duplicate embeddings."""

    group_id: str
    is_exact: bool
    min_similarity: float
    member_count: int
    members: list[DuplicateMember]


class DuplicateDetectionResult(BaseModel):
    """Collection-wide duplicate & near-duplicate detection per Phase 7."""

    threshold: float
    exact_duplicate_count: int
    exact_group_count: int
    near_duplicate_count: int
    near_group_count: int
    total_redundant_vectors: int
    redundancy_rate: float
    groups: list[DuplicateGroup]
    interpretation: str


class ClusterInfo(BaseModel):
    """Cluster properties, centroid distance, and metadata profile."""

    cluster_id: int
    name: str
    size: int
    percentage: float
    mean_intra_distance: float
    nearest_cluster_id: int | None = None
    nearest_cluster_distance: float | None = None
    sample_members: list[str] = Field(default_factory=list)
    dominant_metadata: dict[str, str] = Field(default_factory=dict)


class ClusterQualityMetrics(BaseModel):
    """Mathematical cluster quality indices per Phase 9."""

    silhouette_score: float
    davies_bouldin_index: float
    mean_intra_cluster_distance: float
    mean_inter_cluster_distance: float
    quality_interpretation: str


class ClusteringResult(BaseModel):
    """Collection-wide clustering & quality evaluation per Phase 8 & 9."""

    algorithm: str  # "minibatch_kmeans", "kmeans"
    k: int
    clusters: list[ClusterInfo]
    quality: ClusterQualityMetrics
    distance_metric: str = "cosine"
    interpretation: str


class CategoryStats(BaseModel):
    """Embedding distribution metrics for an individual categorical metadata value."""

    name: str
    count: int
    percentage: float
    mean_distance_to_centroid: float
    norm_mean: float


class NumericFieldStats(BaseModel):
    """Statistical distribution & correlation metrics for a numeric metadata field."""

    name: str
    stats: DistributionStats
    norm_correlation: float | None = None
    density_correlation: float | None = None


class MetadataAnalysisResult(BaseModel):
    """Metadata ↔ embedding manifold correlation per Phase 10."""

    field_name: str
    field_type: str  # "categorical", "numeric"
    total_vectors_with_field: int
    coverage_rate: float
    unique_values_count: int
    categories: list[CategoryStats] | None = None
    cluster_purity: float | None = None
    normalized_mutual_information: float | None = None
    numeric_stats: NumericFieldStats | None = None
    interpretation: str


class TimeWindowStats(BaseModel):
    """Embedding centroid & norm statistics within a specific temporal window."""

    window_label: str
    start_time: str
    end_time: str
    vector_count: int
    centroid_drift_from_previous: float | None = None
    mean_norm: float
    mean_internal_similarity: float | None = None


class TemporalDriftResult(BaseModel):
    """Temporal embedding space dynamics & centroid drift per Phase 11."""

    timestamp_field: str
    granularity: str  # "day", "week", "month", "quarter", "year"
    total_windows: int
    windows: list[TimeWindowStats]
    mean_consecutive_drift: float
    max_drift_window: str | None = None
    max_drift_value: float | None = None
    interpretation: str
