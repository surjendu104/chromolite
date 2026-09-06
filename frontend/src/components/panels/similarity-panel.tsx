import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Play,
  Sliders,
} from 'lucide-react';
import { useCollectionStore } from '../../store/collection.store';
import { getSimilarityDistribution } from '../../service/analysis.service';
import type {
  AnalysisResponse,
  SimilarityDistributionResult,
} from '../../store/analysis.types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Panel, PanelHeader, PanelBody } from '../ui/panel';
import { Metric } from '../ui/metric';
import { LoadingState } from '../ui/loading-state';
import { DistributionHistogram } from '../ui/distribution-histogram';
import { StatsTable } from '../ui/stats-table';

export const SimilarityPanel: React.FC = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);

  const [pairSampleCount, setPairSampleCount] = useState<number>(50000);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [data, setData] =
    useState<AnalysisResponse<SimilarityDistributionResult> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!activeCollection) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSimilarityDistribution(
        activeCollection.name,
        pairSampleCount,
        10000,
        randomSeed,
      );
      setData(res);
    } catch (err: unknown) {
      console.error('Failed to compute similarity distribution', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to compute similarity distribution.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeCollection, pairSampleCount, randomSeed]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const totalVectors = details?.document_count ?? 0;
  const result = data?.result;

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-text-muted font-mono text-[10px] font-semibold tracking-wider uppercase">
                EMBEDDING DIAGNOSTICS
              </span>
              <Badge variant="accent" size="xs" mono>
                Phase 2
              </Badge>
              {data && (
                <Badge variant="neutral" size="xs" mono>
                  {data.method === 'exact'
                    ? 'Exact All-Pairs'
                    : `Sampled (${result?.pair_sample_count.toLocaleString()} pairs)`}
                </Badge>
              )}
            </div>
            <h1 className="text-foreground flex items-center gap-2 font-sans text-[22px] font-semibold tracking-tight">
              <Activity className="text-accent h-5 w-5" />
              Similarity Distribution
            </h1>
            <p className="text-text-secondary mt-1 max-w-2xl text-[13px] leading-normal">
              Pairwise vector similarity in original high-dimensional space.
              Evaluates embedding space dispersion, angular geometry, and potential
              anisotropy (cone effect).
            </p>
          </div>

          {/* Execution Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              isLoading={isLoading}
              leftIcon={<Play className="h-3.5 w-3.5" />}
              onClick={runAnalysis}
            >
              Run Similarity Analysis
            </Button>
          </div>
        </div>

        {/* Configuration Parameters Panel */}
        <Panel subtle className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-[12px]">
              <div className="flex items-center gap-2">
                <Sliders className="text-text-muted h-3.5 w-3.5" />
                <span className="text-text-secondary font-sans font-medium">
                  Sampled Pairs:
                </span>
                <select
                  value={pairSampleCount}
                  onChange={(e) => setPairSampleCount(Number(e.target.value))}
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value={10000}>10,000 pairs</option>
                  <option value={25000}>25,000 pairs</option>
                  <option value={50000}>50,000 pairs (recommended)</option>
                  <option value={100000}>100,000 pairs</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-sans font-medium">
                  Random Seed:
                </span>
                <input
                  type="number"
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(Number(e.target.value))}
                  className="bg-surface border-border text-foreground w-16 rounded border px-2 py-1 font-mono text-[11.5px]"
                />
              </div>
            </div>

            <div className="text-text-muted font-mono text-[11px]">
              Subsampled to prevent O(N²) quadratic overhead on{' '}
              {totalVectors.toLocaleString()} vectors
            </div>
          </div>
        </Panel>

        {/* Error State */}
        {error && (
          <div className="border-error/40 bg-error/10 text-error flex items-start gap-2.5 rounded-md border p-3.5 text-[12.5px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">Analysis Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !result && (
          <div className="py-16">
            <LoadingState label="Extracting vectors and computing pairwise similarity distributions in Python ML engine…" />
          </div>
        )}

        {result && (
          <>
            {/* Top Key Statistical Metrics */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <Panel subtle className="p-4">
                <Metric
                  label="Mean Pairwise Cosine"
                  value={result.mean_pairwise_similarity.toFixed(3)}
                  description={
                    result.is_potentially_anisotropic
                      ? 'Elevated (> 0.70)'
                      : 'Healthy dispersion'
                  }
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Median Similarity"
                  value={result.pairwise_similarity.median.toFixed(3)}
                  description="P50 pairwise score"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="P05 – P95 Range"
                  value={`[${result.pairwise_similarity.p05.toFixed(2)}, ${result.pairwise_similarity.p95.toFixed(2)}]`}
                  description="90% distribution bounds"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="1-NN Mean Similarity"
                  value={
                    result.nearest_neighbor_similarity
                      ? result.nearest_neighbor_similarity.mean.toFixed(3)
                      : '—'
                  }
                  description="Nearest neighbor consistency"
                  size="standard"
                />
              </Panel>
            </div>

            {/* Anisotropy Diagnostic Card */}
            <div
              className={`flex items-start gap-3 rounded-md border p-4 text-[12.5px] ${
                result.is_potentially_anisotropic
                  ? 'border-warning/50 bg-warning/10 text-text-primary'
                  : 'border-border bg-surface-subtle/40 text-text-primary'
              }`}
            >
              {result.is_potentially_anisotropic ? (
                <AlertTriangle className="text-warning mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <CheckCircle2 className="text-success mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-semibold">
                    {result.is_potentially_anisotropic
                      ? 'Potential Embedding Anisotropy Detected'
                      : 'Normal Embedding Space Dispersion'}
                  </span>
                  <Badge
                    variant={
                      result.is_potentially_anisotropic ? 'warning' : 'success'
                    }
                    size="xs"
                  >
                    {result.is_potentially_anisotropic
                      ? 'Cone Effect'
                      : 'Isotropic'}
                  </Badge>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  {result.anisotropy_interpretation}
                </p>
              </div>
            </div>

            {/* Global Pairwise Similarity Histogram */}
            <Panel>
              <PanelHeader
                title="Global Pairwise Similarity Distribution"
                description={`Cosine similarity between ${result.pair_sample_count.toLocaleString()} randomly paired vectors in original ${details?.schema ? 'high-dimensional' : ''} space`}
                actions={
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="xs" mono>
                      Range: [{result.pairwise_similarity.min.toFixed(2)},{' '}
                      {result.pairwise_similarity.max.toFixed(2)}]
                    </Badge>
                  </div>
                }
              />
              <PanelBody className="space-y-4 py-4">
                <div className="border-border bg-surface-subtle/30 rounded-md border p-4">
                  <DistributionHistogram
                    data={result.similarity_histogram}
                    label="Pairwise Cosine Similarity Histogram"
                    median={result.pairwise_similarity.median}
                    p05={result.pairwise_similarity.p05}
                    p95={result.pairwise_similarity.p95}
                    height={150}
                  />
                </div>

                {/* Exact Percentiles Table */}
                <div>
                  <div className="text-text-secondary mb-1.5 font-sans text-[12px] font-medium">
                    Exact Sampled Percentile Values
                  </div>
                  <StatsTable stats={result.pairwise_similarity} decimals={4} />
                </div>
              </PanelBody>
            </Panel>

            {/* Local 1-NN Similarity Distribution Section */}
            {result.nearest_neighbor_similarity && (
              <Panel>
                <PanelHeader
                  title="1-Nearest Neighbor (1-NN) Similarity"
                  description="Similarity to the single closest distinct neighbor for each vector probe in the collection"
                />
                <PanelBody className="py-4">
                  <StatsTable
                    stats={result.nearest_neighbor_similarity}
                    decimals={4}
                  />
                </PanelBody>
              </Panel>
            )}

            {/* Methodological & Explainability Footer */}
            <div className="border-border bg-surface-subtle/50 text-text-secondary flex items-start gap-2.5 rounded-md border p-3.5 text-[12px]">
              <Info className="text-accent mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <span className="text-foreground font-sans font-medium">
                  Mathematical Interpretation Notice
                </span>
                <p className="leading-relaxed">
                  High global similarity is not inherently defective, but indicates
                  that representations are clustered in a directional subspace.
                  Local 1-NN similarity reflects neighborhood density, while
                  global similarity reflects overall manifold dispersion. All
                  calculations use exact high-dimensional cosine arithmetic
                  without 2D dimensional reduction.
                </p>
                <div className="text-text-muted mt-2 flex items-center justify-between font-mono text-[11px]">
                  <span>
                    Formula: cos(u, v) = (u · v) / (||u||₂ · ||v||₂)
                  </span>
                  <span>Execution: {data.execution_time_ms.toFixed(1)}ms</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SimilarityPanel;
