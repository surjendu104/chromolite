import type {
  AnalysisResponse,
  ClusteringResult,
  CollectionHealthResult,
  CollectionSummary,
  DuplicateDetectionResult,
  KnnDensityResult,
  MetadataAnalysisResult,
  MetricDefinition,
  NeighborInfo,
  OutlierDetectionResult,
  ProjectionResult,
  SimilarityDistributionResult,
  TemporalDriftResult,
} from '../store/analysis.types';

const API_BASE = import.meta.env.VITE_SERVER_URL || '/api';

export const getMetricDefinitions = async (): Promise<MetricDefinition[]> => {
  const res = await fetch(`${API_BASE}/analysis/metrics`);
  if (!res.ok) {
    throw new Error(`Failed to load metric definitions: ${res.statusText}`);
  }
  return res.json();
};

export const getCollectionAnalysisSummary = async (
  collectionName: string,
): Promise<CollectionSummary> => {
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/summary`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load analysis summary for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getCollectionHealth = async (
  collectionName: string,
  maxSamples: number = 10000,
  randomSeed: number = 42,
): Promise<AnalysisResponse<CollectionHealthResult>> => {
  const params = new URLSearchParams({
    max_samples: String(maxSamples),
    random_seed: String(randomSeed),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/health?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load collection health for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getSimilarityDistribution = async (
  collectionName: string,
  pairSampleCount: number = 50000,
  maxSamples: number = 10000,
  randomSeed: number = 42,
): Promise<AnalysisResponse<SimilarityDistributionResult>> => {
  const params = new URLSearchParams({
    pair_sample_count: String(pairSampleCount),
    max_samples: String(maxSamples),
    random_seed: String(randomSeed),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/similarity?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load similarity distribution for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getProjection = async (
  collectionName: string,
  algorithm: 'pca' | 'umap' | 'tsne' = 'pca',
  maxSamples: number = 5000,
  nNeighbors: number = 15,
  perplexity: number = 30.0,
  randomSeed: number = 42,
): Promise<AnalysisResponse<ProjectionResult>> => {
  const params = new URLSearchParams({
    algorithm,
    max_samples: String(maxSamples),
    n_neighbors: String(nNeighbors),
    perplexity: String(perplexity),
    random_seed: String(randomSeed),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/projection?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load ${algorithm.toUpperCase()} projection for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getKnnDensity = async (
  collectionName: string,
  k: number = 15,
  maxSamples: number = 10000,
  randomSeed: number = 42,
): Promise<AnalysisResponse<KnnDensityResult>> => {
  const params = new URLSearchParams({
    k: String(k),
    max_samples: String(maxSamples),
    random_seed: String(randomSeed),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/knn?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load kNN density for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getVectorNeighbors = async (
  collectionName: string,
  vectorId: string,
  k: number = 15,
): Promise<NeighborInfo[]> => {
  const params = new URLSearchParams({
    k: String(k),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/vectors/${encodeURIComponent(vectorId)}/neighbors?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load neighbors for ${vectorId}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getOutliers = async (
  collectionName: string,
  method: 'knn_distance' | 'lof' = 'knn_distance',
  thresholdQuantile: number = 0.01,
  k: number = 15,
  maxSamples: number = 10000,
  randomSeed: number = 42,
): Promise<AnalysisResponse<OutlierDetectionResult>> => {
  const params = new URLSearchParams({
    method,
    threshold_quantile: String(thresholdQuantile),
    k: String(k),
    max_samples: String(maxSamples),
    random_seed: String(randomSeed),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/outliers?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load outlier detection for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getDuplicates = async (
  collectionName: string,
  threshold: number = 0.98,
  maxSamples: number = 10000,
  randomSeed: number = 42,
): Promise<AnalysisResponse<DuplicateDetectionResult>> => {
  const params = new URLSearchParams({
    threshold: String(threshold),
    max_samples: String(maxSamples),
    random_seed: String(randomSeed),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/duplicates?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load duplicate detection for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getClustering = async (
  collectionName: string,
  k: number = 8,
  algorithm: 'minibatch_kmeans' | 'kmeans' = 'minibatch_kmeans',
  maxSamples: number = 10000,
  randomSeed: number = 42,
): Promise<AnalysisResponse<ClusteringResult>> => {
  const params = new URLSearchParams({
    k: String(k),
    algorithm,
    max_samples: String(maxSamples),
    random_seed: String(randomSeed),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/clusters?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load clustering for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getMetadataAnalysis = async (
  collectionName: string,
  fieldName: string,
  maxSamples: number = 10000,
  randomSeed: number = 42,
): Promise<AnalysisResponse<MetadataAnalysisResult>> => {
  const params = new URLSearchParams({
    max_samples: String(maxSamples),
    random_seed: String(randomSeed),
  });
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/metadata/${encodeURIComponent(fieldName)}?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load metadata analysis for ${fieldName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const getTemporalDrift = async (
  collectionName: string,
  timestampField?: string | null,
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month',
  maxSamples: number = 10000,
  randomSeed: number = 42,
): Promise<AnalysisResponse<TemporalDriftResult>> => {
  const params = new URLSearchParams({
    granularity,
    max_samples: String(maxSamples),
    random_seed: String(randomSeed),
  });
  if (timestampField) {
    params.set('timestamp_field', timestampField);
  }
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/temporal?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load temporal drift for ${collectionName}: ${res.statusText}`,
    );
  }
  return res.json();
};

export const clearCollectionCache = async (
  collectionName: string,
): Promise<{ status: string; message: string }> => {
  const res = await fetch(
    `${API_BASE}/analysis/${encodeURIComponent(collectionName)}/cache/clear`,
    {
      method: 'POST',
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to clear cache: ${res.statusText}`);
  }
  return res.json();
};
