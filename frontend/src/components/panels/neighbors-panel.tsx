import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Play,
  Info,
  AlertTriangle,
  Sliders,
  X,
  FileText,
} from 'lucide-react';
import { useCollectionStore } from '../../store/collection.store';
import {
  getKnnDensity,
  getVectorNeighbors,
} from '../../service/analysis.service';
import type {
  AnalysisResponse,
  KnnDensityResult,
  NeighborInfo,
  VectorDensityInfo,
} from '../../store/analysis.types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Panel, PanelHeader, PanelBody } from '../ui/panel';
import { Metric } from '../ui/metric';
import { LoadingState } from '../ui/loading-state';
import { DistributionHistogram } from '../ui/distribution-histogram';
import { StatsTable } from '../ui/stats-table';

export const NeighborsPanel: React.FC = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);

  const [kValue, setKValue] = useState<number>(15);
  const [sampleSize, setSampleSize] = useState<number>(10000);
  const [randomSeed, setRandomSeed] = useState<number>(42);

  const [data, setData] = useState<AnalysisResponse<KnnDensityResult> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspector state for a selected vector
  const [selectedVector, setSelectedVector] = useState<VectorDensityInfo | null>(
    null,
  );
  const [neighborsList, setNeighborsList] = useState<NeighborInfo[]>([]);
  const [loadingNeighbors, setLoadingNeighbors] = useState(false);

  const loadNeighbors = useCallback(async (vectorId: string, k: number) => {
    if (!activeCollection) return;
    setLoadingNeighbors(true);
    try {
      const res = await getVectorNeighbors(activeCollection.name, vectorId, k);
      setNeighborsList(res);
    } catch (err) {
      console.error('Failed to load vector neighbors', err);
    } finally {
      setLoadingNeighbors(false);
    }
  }, [activeCollection]);

  const runAnalysis = useCallback(async () => {
    if (!activeCollection) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getKnnDensity(
        activeCollection.name,
        kValue,
        sampleSize,
        randomSeed,
      );
      setData(res);
    } catch (err: unknown) {
      console.error('Failed to compute kNN density', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to compute kNN density analysis.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeCollection, kValue, sampleSize, randomSeed]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const handleSelectVector = (vec: VectorDensityInfo) => {
    setSelectedVector(vec);
    loadNeighbors(vec.id, kValue);
  };

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
                LOCAL STRUCTURE
              </span>
              {/*<Badge variant="accent" size="xs" mono>
                Phase 5
              </Badge>*/}
              {data && (
                <Badge variant="neutral" size="xs" mono>
                  k = {result?.k}
                </Badge>
              )}
            </div>
            <h1 className="text-foreground flex items-center gap-2 font-sans text-[22px] font-semibold tracking-tight">
              <Radio className="text-accent h-5 w-5" />
              kNN & Local Density Analysis
            </h1>
            <p className="text-text-secondary mt-1 max-w-2xl text-[13px] leading-normal">
              Evaluates neighborhood tightness and relative local density scores in original
              embedding space. Identifies dense semantic clusters and isolates peripheral outliers.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<Play className="h-3.5 w-3.5" />}
            onClick={runAnalysis}
          >
            Compute kNN Analysis
          </Button>
        </div>

        {/* Configuration Toolbar */}
        <Panel subtle className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[12px]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Sliders className="text-text-muted h-3.5 w-3.5" />
                <span className="text-text-secondary font-sans font-medium">
                  k Neighbors:
                </span>
                <select
                  value={kValue}
                  onChange={(e) => setKValue(Number(e.target.value))}
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value={5}>k = 5</option>
                  <option value={10}>k = 10</option>
                  <option value={15}>k = 15 (default)</option>
                  <option value={20}>k = 20</option>
                  <option value={50}>k = 50</option>
                  <option value={100}>k = 100</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-sans font-medium">
                  Sample Size:
                </span>
                <select
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value={1000}>1,000 vectors</option>
                  <option value={5000}>5,000 vectors</option>
                  <option value={10000}>10,000 vectors</option>
                  <option value={25000}>25,000 vectors</option>
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
              Collection: {totalVectors.toLocaleString()} total embeddings
            </div>
          </div>
        </Panel>

        {/* Error State */}
        {error && (
          <div className="border-error/40 bg-error/10 text-error flex items-start gap-2.5 rounded-md border p-3.5 text-[12.5px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">kNN Analysis Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !result && (
          <div className="py-16">
            <LoadingState label={`Building kNN graph (k=${kValue}) and calculating density metrics in Python…`} />
          </div>
        )}

        {result && (
          <>
            {/* Top Key Statistical Metrics */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <Panel subtle className="p-4">
                <Metric
                  label={`Mean kNN Dist (k=${result.k})`}
                  value={result.knn_distance_distribution.mean.toFixed(3)}
                  description="Average distance to k-neighbors"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Median kNN Distance"
                  value={result.knn_distance_distribution.median.toFixed(3)}
                  description="P50 neighborhood distance"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Mean Density Index"
                  value={`${result.local_density_distribution.mean.toFixed(1)} / 100`}
                  description="Relative neighborhood density"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="P05 – P95 Dist Range"
                  value={`[${result.knn_distance_distribution.p05.toFixed(2)}, ${result.knn_distance_distribution.p95.toFixed(2)}]`}
                  description="Distance spread across manifold"
                  size="standard"
                />
              </Panel>
            </div>

            {/* Dual Histograms: Distance & Density */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Panel>
                <PanelHeader
                  title="Mean kNN Distance Distribution"
                  description={`Distribution of mean distances to ${result.k} nearest neighbors`}
                />
                <PanelBody className="space-y-3 py-3">
                  <DistributionHistogram
                    data={result.knn_distance_histogram}
                    label="Neighborhood Distance (Cosine Distance)"
                    median={result.knn_distance_distribution.median}
                    p05={result.knn_distance_distribution.p05}
                    p95={result.knn_distance_distribution.p95}
                    height={130}
                  />
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Relative Local Density Score Distribution"
                  description="Normalized inverse kNN distance score [0 – 100]"
                />
                <PanelBody className="space-y-3 py-3">
                  <DistributionHistogram
                    data={result.local_density_histogram}
                    label="Local Density Score [0 to 100]"
                    median={result.local_density_distribution.median}
                    p05={result.local_density_distribution.p05}
                    p95={result.local_density_distribution.p95}
                    height={130}
                  />
                </PanelBody>
              </Panel>
            </div>

            {/* Exact Distance Percentiles Table */}
            <Panel>
              <PanelHeader
                title="kNN Distance Percentiles"
                description={`Exact percentile values for k=${result.k} neighborhood distances`}
              />
              <PanelBody className="py-3">
                <StatsTable stats={result.knn_distance_distribution} decimals={4} />
              </PanelBody>
            </Panel>

            {/* Extremes: Densest Core Clusters vs Sparsest Peripheral Vectors */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Densest Vectors */}
              <Panel>
                <PanelHeader
                  title="Densest Vectors (Core Clusters)"
                  description="Vectors with lowest kNN distances and tightest local neighborhoods"
                />
                <div className="divide-border divide-y overflow-y-auto max-h-64">
                  {result.densest_vectors.slice(0, 6).map((vec, idx) => (
                    <div
                      key={vec.id}
                      onClick={() => handleSelectVector(vec)}
                      className={`hover:bg-surface-subtle flex cursor-pointer items-center justify-between p-3 text-[12px] transition-colors ${
                        selectedVector?.id === vec.id ? 'bg-surface-subtle border-l-2 border-accent' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-foreground">
                          <span className="text-text-muted">#{idx + 1}</span>
                          <span className="truncate">{vec.id}</span>
                        </div>
                        {vec.document && (
                          <p className="text-text-secondary mt-0.5 truncate text-[11px]">
                            {vec.document}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-accent font-semibold text-[11.5px]">
                          {vec.local_density_score.toFixed(1)} score
                        </div>
                        <div className="text-text-muted font-mono text-[10.5px]">
                          dist: {vec.mean_knn_distance.toFixed(3)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Sparsest Vectors */}
              <Panel>
                <PanelHeader
                  title="Sparsest Vectors (Peripheral / Isolated)"
                  description="Vectors with highest kNN distances situated on the manifold perimeter"
                />
                <div className="divide-border divide-y overflow-y-auto max-h-64">
                  {result.sparsest_vectors.slice(0, 6).map((vec, idx) => (
                    <div
                      key={vec.id}
                      onClick={() => handleSelectVector(vec)}
                      className={`hover:bg-surface-subtle flex cursor-pointer items-center justify-between p-3 text-[12px] transition-colors ${
                        selectedVector?.id === vec.id ? 'bg-surface-subtle border-l-2 border-warning' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-foreground">
                          <span className="text-text-muted">#{idx + 1}</span>
                          <span className="truncate">{vec.id}</span>
                        </div>
                        {vec.document && (
                          <p className="text-text-secondary mt-0.5 truncate text-[11px]">
                            {vec.document}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-warning font-semibold text-[11.5px]">
                          {vec.local_density_score.toFixed(1)} score
                        </div>
                        <div className="text-text-muted font-mono text-[10.5px]">
                          dist: {vec.mean_knn_distance.toFixed(3)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Individual Vector Nearest Neighbor Inspector */}
            {selectedVector && (
              <Panel>
                <PanelHeader
                  title={
                    <div className="flex items-center gap-2">
                      <FileText className="text-accent h-4 w-4" />
                      <span>
                        Original-Space Nearest Neighbors for: <strong className="font-mono text-foreground">{selectedVector.id}</strong>
                      </span>
                    </div>
                  }
                  description={`Top ${kValue} retrieved nearest neighbors calculated in original high-dimensional space`}
                  actions={
                    <button
                      type="button"
                      onClick={() => setSelectedVector(null)}
                      className="text-text-muted hover:text-foreground hover:bg-surface-subtle flex h-6 w-6 items-center justify-center rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <PanelBody className="space-y-4 py-4">
                  {/* Selected vector preview */}
                  <div className="border-border bg-surface-subtle/50 rounded border p-3 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium text-foreground">
                        Vector Details ({selectedVector.id})
                      </span>
                      <span className="text-text-muted font-mono text-[11px]">
                        Density: {selectedVector.local_density_score.toFixed(1)}/100 · Mean kNN Dist: {selectedVector.mean_knn_distance.toFixed(4)}
                      </span>
                    </div>
                    {selectedVector.document && (
                      <p className="text-text-secondary mt-2 font-mono text-[11.5px] leading-relaxed">
                        {selectedVector.document}
                      </p>
                    )}
                  </div>

                  {/* Neighbors list table */}
                  {loadingNeighbors ? (
                    <div className="py-6">
                      <LoadingState label="Querying exact high-dimensional nearest neighbors…" />
                    </div>
                  ) : neighborsList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-border bg-surface-subtle/60 text-text-muted border-b font-mono text-[10.5px] uppercase">
                            <th className="px-3 py-2 font-medium">Rank</th>
                            <th className="px-3 py-2 font-medium">Neighbor ID</th>
                            <th className="px-3 py-2 font-medium">Distance</th>
                            <th className="px-3 py-2 font-medium">Similarity</th>
                            <th className="px-3 py-2 font-medium">Document Content</th>
                          </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                          {neighborsList.map((nbr) => (
                            <tr key={nbr.id} className="hover:bg-surface-subtle transition-colors">
                              <td className="px-3 py-2 font-mono font-semibold text-accent">
                                #{nbr.rank}
                              </td>
                              <td className="px-3 py-2 font-mono font-medium text-foreground max-w-[140px] truncate">
                                {nbr.id}
                              </td>
                              <td className="px-3 py-2 font-mono text-text-secondary">
                                {nbr.distance.toFixed(4)}
                              </td>
                              <td className="px-3 py-2 font-mono font-medium text-foreground">
                                {nbr.similarity.toFixed(4)}
                              </td>
                              <td className="px-3 py-2 text-text-secondary max-w-[280px] truncate font-sans">
                                {nbr.document || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-text-muted text-[12px] py-2 text-center">
                      No neighbors found for this vector.
                    </p>
                  )}
                </PanelBody>
              </Panel>
            )}

            {/* Methodological / Mathematical Notice */}
            <div className="border-border bg-surface-subtle/50 text-text-secondary flex items-start gap-2.5 rounded-md border p-3.5 text-[12px]">
              <Info className="text-accent mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <span className="text-foreground font-sans font-medium">
                  kNN & Local Density Definition
                </span>
                <p className="leading-relaxed">
                  Local density score is a relative measure derived from the inverse mean distance to the k-nearest neighbors:
                  <code className="bg-surface text-foreground mx-1 rounded border px-1 py-0.5 font-mono text-[11px]">
                    density(x) = 1 / (mean(d(x, kNN(x))) + ε)
                  </code>
                  . It measures the relative tightness of a vector&apos;s neighborhood in original high-dimensional space without 2D projection distortion.
                </p>
                <div className="text-text-muted mt-2 flex items-center justify-between font-mono text-[11px]">
                  <span>Metric: {result.distance_metric.toUpperCase()}</span>
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

export default NeighborsPanel;
