/**
 * Analytical API Types & Data Contracts per AGENTS.md
 */

export type AnalysisMethod =
  | 'exact'
  | 'sampled'
  | 'approximate'
  | 'estimated'
  | 'unavailable';

export type AnalysisStatus =
  | 'completed'
  | 'partial'
  | 'empty'
  | 'failed'
  | 'unavailable';

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  formula?: string | null;
  interpretation?: string | null;
  range_min?: number | null;
  range_max?: number | null;
  unit?: string | null;
  higher_is_better?: boolean | null;
}

export interface AnalysisResponse<T = unknown> {
  status: AnalysisStatus;
  metric_id: string;
  computed_on: number;
  total_vectors: number;
  method: AnalysisMethod;
  approximate: boolean;
  parameters: Record<string, unknown>;
  result: T;
  execution_time_ms: number;
  warnings: string[];
  unavailable_reason?: string | null;
}

export interface MetadataFieldSummary {
  name: string;
  data_type: string;
  sample_values: unknown[];
  unique_count: number | null;
  null_count: number;
  is_high_cardinality: boolean;
}

export interface IndexInformation {
  space: string;
  ef_construction?: number | null;
  ef_search?: number | null;
  max_neighbors?: number | null;
  resize_factor?: number | null;
  sync_threshold?: number | null;
  raw_configuration: Record<string, unknown>;
}

export interface DistributionStats {
  min: number;
  p01: number;
  p05: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
  std: number;
}

export interface HistogramData {
  bins: number[];
  counts: number[];
  bin_centers: number[];
}

export interface CollectionHealthResult {
  vector_count: number;
  dimension: number | null;
  distance_metric: string;
  is_unit_normalized: boolean;
  unit_norm_tolerance: number;
  norms: DistributionStats;
  norm_histogram: HistogramData;
  zero_vector_count: number;
  invalid_vector_count: number;
  health_status: 'healthy' | 'warning' | 'critical' | 'empty';
  anomalies: string[];
}

export interface SimilarityDistributionResult {
  distance_metric: string;
  pair_sample_count: number;
  pairwise_similarity: DistributionStats;
  similarity_histogram: HistogramData;
  mean_pairwise_similarity: number;
  is_potentially_anisotropic: boolean;
  anisotropy_interpretation: string;
  nearest_neighbor_similarity?: DistributionStats | null;
}

export interface CollectionSummary {
  id: string;
  name: string;
  vector_count: number;
  dimension: number | null;
  distance_metric: string;
  database: string;
  tenant: string;
  metadata_fields: MetadataFieldSummary[];
  index_information: IndexInformation;
  collection_metadata: Record<string, unknown>;
}
