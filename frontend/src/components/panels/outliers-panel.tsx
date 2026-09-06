import React, { useState, useEffect, useCallback } from 'react';
import {
  GitFork,
  Play,
  Info,
  AlertTriangle,
  Sliders,
  X,
  FileText,
  Hash,
} from 'lucide-react';
import { useCollectionStore } from '../../store/collection.store';
import {
  getOutliers,
  getVectorNeighbors,
} from '../../service/analysis.service';
import type {
  AnalysisResponse,
  NeighborInfo,
  OutlierDetectionResult,
  OutlierVector,
} from '../../store/analysis.types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Panel, PanelHeader, PanelBody } from '../ui/panel';
import { Metric } from '../ui/metric';
import { LoadingState } from '../ui/loading-state';
import { CopyButton } from '../ui/copy-button';
import { DistributionHistogram } from '../ui/distribution-histogram';
import { StatsTable } from '../ui/stats-table';

export const OutliersPanel: React.FC = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);

  const [method, setMethod] = useState<'knn_distance' | 'lof'>('knn_distance');
  const [thresholdQuantile, setThresholdQuantile] = useState<number>(0.01);
  const [kValue, setKValue] = useState<number>(15);
  const [sampleSize, setSampleSize] = useState<number>(10000);
  const [randomSeed, setRandomSeed] = useState<number>(42);

  const [data, setData] =
    useState<AnalysisResponse<OutlierDetectionResult> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspector state
  const [selectedOutlier, setSelectedOutlier] = useState<OutlierVector | null>(
    null,
  );
  const [neighborsList, setNeighborsList] = useState<NeighborInfo[]>([]);
  const [loadingNeighbors, setLoadingNeighbors] = useState(false);

  const runAnalysis = useCallback(async () => {
    if (!activeCollection) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getOutliers(
        activeCollection.name,
        method,
        thresholdQuantile,
        kValue,
        sampleSize,
        randomSeed,
      );
      setData(res);
      if (selectedOutlier) {
        loadNeighbors(selectedOutlier.id, kValue);
      }
    } catch (err: unknown) {
      console.error('Failed to detect outliers', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to compute outlier detection analysis.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    activeCollection,
    method,
    thresholdQuantile,
    kValue,
    sampleSize,
    randomSeed,
    selectedOutlier,
  ]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const loadNeighbors = async (vectorId: string, k: number) => {
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
  };

  const handleSelectOutlier = (vec: OutlierVector) => {
    setSelectedOutlier(vec);
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
                ANOMALIES & ISOLATION
              </span>
              <Badge variant="accent" size="xs" mono>
                Phase 6
              </Badge>
              {data && (
                <Badge variant="warning" size="xs" mono>
                  Top {(thresholdQuantile * 100).toFixed(1)}% Cutoff
                </Badge>
              )}
            </div>
            <h1 className="text-foreground flex items-center gap-2 font-sans text-[22px] font-semibold tracking-tight">
              <GitFork className="text-accent h-5 w-5" />
              Outlier & Isolation Detection
            </h1>
            <p className="text-text-secondary mt-1 max-w-2xl text-[13px] leading-normal">
              Detects vectors that are unusually isolated relative to their local
              neighborhoods using original-space distance metrics and Local Outlier
              Factor (LOF).
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<Play className="h-3.5 w-3.5" />}
            onClick={runAnalysis}
          >
            Detect Outliers
          </Button>
        </div>

        {/* Configuration Toolbar */}
        <Panel subtle className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[12px]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Sliders className="text-text-muted h-3.5 w-3.5" />
                <span className="text-text-secondary font-sans font-medium">
                  Method:
                </span>
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as 'knn_distance' | 'lof')
                  }
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value="knn_distance">kNN Distance Isolation</option>
                  <option value="lof">Local Outlier Factor (LOF)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-sans font-medium">
                  Threshold:
                </span>
                <select
                  value={thresholdQuantile}
                  onChange={(e) => setThresholdQuantile(Number(e.target.value))}
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value={0.001}>Top 0.1% (Extreme Anomaly)</option>
                  <option value={0.01}>Top 1.0% (Standard Cutoff)</option>
                  <option value={0.05}>Top 5.0% (Broad Isolation)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
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
                  <option value={15}>k = 15</option>
                  <option value={20}>k = 20</option>
                  <option value={50}>k = 50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-sans font-medium">
                  Sample:
                </span>
                <select
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                  <option value={10000}>10,000</option>
                  <option value={25000}>25,000</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-sans font-medium">
                  Seed:
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
              Collection: {totalVectors.toLocaleString()} total vectors
            </div>
          </div>
        </Panel>

        {/* Error State */}
        {error && (
          <div className="border-error/40 bg-error/10 text-error flex items-start gap-2.5 rounded-md border p-3.5 text-[12.5px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">Outlier Detection Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !result && (
          <div className="py-16">
            <LoadingState label={`Evaluating outlier scores and local reachability via ${method.toUpperCase()}…`} />
          </div>
        )}

        {result && (
          <>
            {/* Top Key Statistical Metrics */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <Panel subtle className="p-4">
                <Metric
                  label="Flagged Outliers"
                  value={result.outliers_count.toLocaleString()}
                  description={`Top ${(thresholdQuantile * 100).toFixed(1)}% quantile`}
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Outlier Rate"
                  value={`${(result.outlier_rate * 100).toFixed(2)}%`}
                  description="Fraction of collection"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Cutoff Threshold"
                  value={result.cutoff_score.toFixed(3)}
                  description="Anomaly boundary score"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Isolation Algorithm"
                  value={result.method === 'lof' ? 'LOF' : 'kNN Distance'}
                  description={`k = ${result.k} neighbors`}
                  size="standard"
                />
              </Panel>
            </div>

            {/* Outlier Score Histogram & Distribution */}
            <Panel>
              <PanelHeader
                title="Isolation Score Distribution"
                description={`Distribution of ${result.method === 'lof' ? 'Local Outlier Factor (LOF)' : 'mean kNN distance'} scores across vectors`}
                actions={
                  <Badge variant="neutral" size="xs" mono>
                    Cutoff: {result.cutoff_score.toFixed(3)}
                  </Badge>
                }
              />
              <PanelBody className="space-y-4 py-4">
                <div className="border-border bg-surface-subtle/30 rounded-md border p-3.5">
                  <DistributionHistogram
                    data={result.outlier_score_histogram}
                    label={`${result.method === 'lof' ? 'LOF Score' : 'Mean kNN Distance'} Distribution`}
                    median={result.outlier_score_distribution.median}
                    p05={result.outlier_score_distribution.p05}
                    p95={result.cutoff_score}
                    height={130}
                  />
                </div>

                <StatsTable
                  stats={result.outlier_score_distribution}
                  decimals={4}
                />
              </PanelBody>
            </Panel>

            {/* Flagged Outlier Vectors Table */}
            <Panel>
              <PanelHeader
                title={`Flagged Outlier Vectors (${result.outliers_count})`}
                description="Vectors exceeding isolation cutoff score. Click a vector to inspect its local neighborhood and nearest vectors."
              />
              {result.outliers.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-[12.5px]">
                  No vectors exceed the selected {thresholdQuantile * 100}% anomaly threshold.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-border bg-surface-subtle/60 text-text-muted border-b font-mono text-[10.5px] uppercase">
                        <th className="px-3.5 py-2.5 font-medium">Rank</th>
                        <th className="px-3.5 py-2.5 font-medium">Vector ID</th>
                        <th className="px-3.5 py-2.5 font-medium">Score</th>
                        <th className="px-3.5 py-2.5 font-medium">Isolation Factor</th>
                        <th className="px-3.5 py-2.5 font-medium">Density</th>
                        <th className="px-3.5 py-2.5 font-medium">Norm</th>
                        <th className="px-3.5 py-2.5 font-medium">Document Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {result.outliers.map((vec, idx) => (
                        <tr
                          key={vec.id}
                          onClick={() => handleSelectOutlier(vec)}
                          className={`hover:bg-surface-subtle cursor-pointer transition-colors ${
                            selectedOutlier?.id === vec.id
                              ? 'bg-surface-subtle font-medium'
                              : ''
                          }`}
                        >
                          <td className="px-3.5 py-2 font-mono font-semibold text-warning">
                            #{idx + 1}
                          </td>
                          <td className="px-3.5 py-2 font-mono font-medium text-foreground max-w-[140px] truncate">
                            {vec.id}
                          </td>
                          <td className="px-3.5 py-2 font-mono font-semibold text-foreground">
                            {vec.outlier_score.toFixed(3)}
                          </td>
                          <td className="px-3.5 py-2 font-mono text-warning">
                            {vec.isolation_factor.toFixed(2)}x median
                          </td>
                          <td className="px-3.5 py-2 font-mono text-text-secondary">
                            {vec.local_density_score.toFixed(1)}/100
                          </td>
                          <td className="px-3.5 py-2 font-mono text-text-muted">
                            {vec.norm.toFixed(3)}
                          </td>
                          <td className="px-3.5 py-2 text-text-secondary max-w-[240px] truncate font-sans">
                            {vec.document || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* Selected Outlier Vector Inspector */}
            {selectedOutlier && (
              <Panel>
                <PanelHeader
                  title={
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-warning h-4 w-4" />
                      <span>
                        Outlier Vector Inspector: <strong className="font-mono text-foreground">{selectedOutlier.id}</strong>
                      </span>
                      <CopyButton text={selectedOutlier.id} size="sm" label="Copy ID" />
                    </div>
                  }
                  description={`Isolation Factor: ${selectedOutlier.isolation_factor.toFixed(2)}x collection median · Outlier Score: ${selectedOutlier.outlier_score.toFixed(4)}`}
                  actions={
                    <button
                      type="button"
                      onClick={() => setSelectedOutlier(null)}
                      className="text-text-muted hover:text-foreground hover:bg-surface-subtle flex h-6 w-6 items-center justify-center rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <PanelBody className="space-y-4 py-4">
                  {/* Outlier summary cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12px]">
                    <div className="border-border bg-surface-subtle rounded border p-2.5">
                      <span className="text-text-muted text-[10.5px]">Isolation Factor</span>
                      <div className="text-warning font-mono font-semibold text-[13px] mt-0.5">
                        {selectedOutlier.isolation_factor.toFixed(2)}x median
                      </div>
                    </div>
                    <div className="border-border bg-surface-subtle rounded border p-2.5">
                      <span className="text-text-muted text-[10.5px]">Mean kNN Distance</span>
                      <div className="text-foreground font-mono font-semibold text-[13px] mt-0.5">
                        {selectedOutlier.mean_knn_distance.toFixed(4)}
                      </div>
                    </div>
                    <div className="border-border bg-surface-subtle rounded border p-2.5">
                      <span className="text-text-muted text-[10.5px]">Local Density Index</span>
                      <div className="text-foreground font-mono font-semibold text-[13px] mt-0.5">
                        {selectedOutlier.local_density_score.toFixed(1)} / 100
                      </div>
                    </div>
                    <div className="border-border bg-surface-subtle rounded border p-2.5">
                      <span className="text-text-muted text-[10.5px]">L2 Vector Norm</span>
                      <div className="text-foreground font-mono font-semibold text-[13px] mt-0.5">
                        {selectedOutlier.norm.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {/* Document and Metadata */}
                  {selectedOutlier.document && (
                    <div className="space-y-1">
                      <span className="text-text-secondary flex items-center gap-1 font-sans text-[11px] font-medium">
                        <FileText className="h-3.5 w-3.5 text-text-muted" /> Document Content
                      </span>
                      <div className="border-border bg-surface-subtle max-h-32 overflow-y-auto rounded border p-2.5 font-mono text-[11.5px] leading-relaxed select-text">
                        {selectedOutlier.document}
                      </div>
                    </div>
                  )}

                  {selectedOutlier.metadata && Object.keys(selectedOutlier.metadata).length > 0 && (
                    <div className="space-y-1">
                      <span className="text-text-secondary flex items-center gap-1 font-sans text-[11px] font-medium">
                        <Hash className="h-3.5 w-3.5 text-text-muted" /> Metadata
                      </span>
                      <div className="border-border divide-border/60 max-h-36 divide-y overflow-y-auto rounded border text-[11.5px]">
                        {Object.entries(selectedOutlier.metadata).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between p-2">
                            <span className="text-text-secondary font-mono text-[11px]">
                              {k}
                            </span>
                            <span className="text-foreground font-mono text-[11px]">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nearest Neighbors for the Outlier */}
                  <div className="space-y-2 pt-2 border-border/70 border-t">
                    <span className="text-foreground font-sans text-[12px] font-medium">
                      Nearest Neighbors in Original Embedding Space
                    </span>
                    {loadingNeighbors ? (
                      <div className="py-4">
                        <LoadingState label="Loading nearest neighbors…" />
                      </div>
                    ) : neighborsList.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11.5px]">
                          <thead>
                            <tr className="border-border bg-surface-subtle text-text-muted border-b font-mono text-[10px] uppercase">
                              <th className="px-3 py-1.5 font-medium">Rank</th>
                              <th className="px-3 py-1.5 font-medium">ID</th>
                              <th className="px-3 py-1.5 font-medium">Distance</th>
                              <th className="px-3 py-1.5 font-medium">Similarity</th>
                              <th className="px-3 py-1.5 font-medium">Document Preview</th>
                            </tr>
                          </thead>
                          <tbody className="divide-border divide-y">
                            {neighborsList.map((nbr) => (
                              <tr key={nbr.id} className="hover:bg-surface-subtle">
                                <td className="px-3 py-1.5 font-mono font-semibold text-accent">
                                  #{nbr.rank}
                                </td>
                                <td className="px-3 py-1.5 font-mono text-foreground truncate max-w-[120px]">
                                  {nbr.id}
                                </td>
                                <td className="px-3 py-1.5 font-mono text-text-secondary">
                                  {nbr.distance.toFixed(4)}
                                </td>
                                <td className="px-3 py-1.5 font-mono font-medium text-foreground">
                                  {nbr.similarity.toFixed(4)}
                                </td>
                                <td className="px-3 py-1.5 text-text-secondary truncate max-w-[260px] font-sans">
                                  {nbr.document || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                </PanelBody>
              </Panel>
            )}

            {/* Methodological / Technical Disclaimer per AGENTS.md */}
            <div className="border-border bg-surface-subtle/50 text-text-secondary flex items-start gap-2.5 rounded-md border p-3.5 text-[12px]">
              <Info className="text-accent mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <span className="text-foreground font-sans font-medium">
                  Outlier Characterization Principle
                </span>
                <p className="leading-relaxed">
                  Flagged vectors are unusually isolated relative to their local
                  neighborhoods. In Vector DB diagnostics, outliers are not
                  inherently defective; they often represent rare domain queries,
                  unique document categories, or vocabulary transitions. Check
                  outliers alongside local density and original-space distances.
                </p>
                <div className="text-text-muted mt-2 flex items-center justify-between font-mono text-[11px]">
                  <span>Metric: {result.method.toUpperCase()}</span>
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

export default OutliersPanel;
