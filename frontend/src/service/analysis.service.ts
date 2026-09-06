import type {
  AnalysisResponse,
  CollectionHealthResult,
  CollectionSummary,
  MetricDefinition,
  SimilarityDistributionResult,
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
