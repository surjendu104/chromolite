import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Play,
  Info,
  AlertTriangle,
  Sliders,
  X,
  Hash,
  Sparkles,
} from 'lucide-react';
import { useCollectionStore } from '../../store/collection.store';
import { getClustering } from '../../service/analysis.service';
import type {
  AnalysisResponse,
  ClusterInfo,
  ClusteringResult,
} from '../../store/analysis.types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Panel, PanelHeader, PanelBody } from '../ui/panel';
import { Metric } from '../ui/metric';
import { LoadingState } from '../ui/loading-state';
import { TOKENS } from '../../lib/tokens';

export const ClustersPanel: React.FC = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);

  const [kClusters, setKClusters] = useState<number>(8);
  const [algorithm, setAlgorithm] = useState<'minibatch_kmeans' | 'kmeans'>(
    'minibatch_kmeans',
  );
  const [sampleSize, setSampleSize] = useState<number>(10000);
  const [randomSeed, setRandomSeed] = useState<number>(42);

  const [data, setData] =
    useState<AnalysisResponse<ClusteringResult> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspector state
  const [selectedCluster, setSelectedCluster] = useState<ClusterInfo | null>(
    null,
  );

  const runClustering = useCallback(async () => {
    if (!activeCollection) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getClustering(
        activeCollection.name,
        kClusters,
        algorithm,
        sampleSize,
        randomSeed,
      );
      setData(res);
      setSelectedCluster((prev) => {
        if (!prev) return null;
        return (
          res.result.clusters.find((c) => c.cluster_id === prev.cluster_id) ||
          null
        );
      });
    } catch (err: unknown) {
      console.error('Failed to cluster collection', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to compute clustering and quality analysis.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeCollection, kClusters, algorithm, sampleSize, randomSeed]);

  useEffect(() => {
    runClustering();
  }, [runClustering]);

  const totalVectors = details?.document_count ?? 0;
  const result = data?.result;
  const palette = TOKENS.colors.visualization;

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-text-muted font-mono text-[10px] font-semibold tracking-wider uppercase">
                TOPOLOGY & STRUCTURE
              </span>
              <Badge variant="accent" size="xs" mono>
                Phase 8 & 9
              </Badge>
              {data && (
                <Badge variant="neutral" size="xs" mono>
                  {result?.k} Partitions · {algorithm === 'minibatch_kmeans' ? 'MiniBatch' : 'K-Means'}
                </Badge>
              )}
            </div>
            <h1 className="text-foreground flex items-center gap-2 font-sans text-[22px] font-semibold tracking-tight">
              <Layers className="text-accent h-5 w-5" />
              Clustering & Quality Analysis
            </h1>
            <p className="text-text-secondary mt-1 max-w-2xl text-[13px] leading-normal">
              Partitions the collection into cohesive semantic clusters and evaluates
              cluster separation using exact Silhouette Scores and Davies-Bouldin indices.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<Play className="h-3.5 w-3.5" />}
            onClick={runClustering}
          >
            Compute Clustering
          </Button>
        </div>

        {/* Configuration Toolbar */}
        <Panel subtle className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[12px]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Sliders className="text-text-muted h-3.5 w-3.5" />
                <span className="text-text-secondary font-sans font-medium">
                  Clusters (k):
                </span>
                <select
                  value={kClusters}
                  onChange={(e) => setKClusters(Number(e.target.value))}
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value={3}>k = 3</option>
                  <option value={5}>k = 5</option>
                  <option value={8}>k = 8 (default)</option>
                  <option value={10}>k = 10</option>
                  <option value={12}>k = 12</option>
                  <option value={16}>k = 16</option>
                  <option value={20}>k = 20</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-sans font-medium">
                  Algorithm:
                </span>
                <select
                  value={algorithm}
                  onChange={(e) =>
                    setAlgorithm(
                      e.target.value as 'minibatch_kmeans' | 'kmeans',
                    )
                  }
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value="minibatch_kmeans">MiniBatch K-Means (Fast)</option>
                  <option value="kmeans">Standard K-Means</option>
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
                  <option value={2500}>2,500</option>
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
              <span className="font-semibold">Clustering Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !result && (
          <div className="py-16">
            <LoadingState label={`Optimizing ${kClusters} cluster centroids and calculating Silhouette separation in Python…`} />
          </div>
        )}

        {result && (
          <>
            {/* Top Cluster Quality Metrics Grid */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <Panel subtle className="p-4">
                <Metric
                  label="Silhouette Score"
                  value={result.quality.silhouette_score.toFixed(3)}
                  description={
                    result.quality.silhouette_score > 0.35
                      ? 'Well-separated (> 0.35)'
                      : result.quality.silhouette_score > 0.15
                        ? 'Moderate overlap'
                        : 'Continuous manifold'
                  }
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Davies-Bouldin Index"
                  value={result.quality.davies_bouldin_index.toFixed(3)}
                  description="Lower indicates tighter clusters"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Mean Intra-Cluster Dist"
                  value={result.quality.mean_intra_cluster_distance.toFixed(3)}
                  description="Average cluster radius"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Cluster Partitions"
                  value={result.k}
                  description={`${result.clusters.length} active partitions`}
                  size="standard"
                />
              </Panel>
            </div>

            {/* Cluster Quality Summary Card */}
            <div className="border-border bg-surface-subtle/40 flex items-start gap-3 rounded-md border p-4 text-[12.5px]">
              <Sparkles className="text-accent mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-semibold text-foreground">
                    Cluster Separation & Quality Diagnostics
                  </span>
                  <Badge
                    variant={
                      result.quality.silhouette_score > 0.35
                        ? 'success'
                        : result.quality.silhouette_score > 0.15
                          ? 'warning'
                          : 'neutral'
                    }
                    size="xs"
                  >
                    {result.quality.silhouette_score > 0.35
                      ? 'Cohesive'
                      : result.quality.silhouette_score > 0.15
                        ? 'Overlapping'
                        : 'Continuous'}
                  </Badge>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  {result.quality.quality_interpretation}
                </p>
              </div>
            </div>

            {/* Segmented Cluster Size Proportions Bar */}
            <Panel>
              <PanelHeader
                title="Cluster Size Proportions"
                description="Distribution of vectors across semantic cluster partitions"
              />
              <PanelBody className="space-y-3 py-3">
                <div className="bg-surface-subtle flex h-4 w-full overflow-hidden rounded">
                  {result.clusters.map((c, i) => (
                    <div
                      key={c.cluster_id}
                      style={{
                        width: `${c.percentage}%`,
                        backgroundColor: palette[i % palette.length],
                      }}
                      title={`${c.name}: ${c.size.toLocaleString()} vectors (${c.percentage.toFixed(1)}%)`}
                      className="hover:opacity-80 h-full transition-opacity cursor-pointer"
                      onClick={() => setSelectedCluster(c)}
                    />
                  ))}
                </div>

                {/* Legend Chips */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11.5px]">
                  {result.clusters.map((c, i) => (
                    <div
                      key={c.cluster_id}
                      onClick={() => setSelectedCluster(c)}
                      className={`hover:bg-surface-subtle flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 transition-colors ${
                        selectedCluster?.cluster_id === c.cluster_id
                          ? 'bg-surface-subtle font-medium'
                          : ''
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: palette[i % palette.length] }}
                      />
                      <span className="text-foreground font-sans">{c.name}</span>
                      <span className="text-text-muted font-mono text-[10.5px]">
                        ({c.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </PanelBody>
            </Panel>

            {/* Comparative Clusters Table */}
            <Panel>
              <PanelHeader
                title={`Cluster Partitions (${result.clusters.length})`}
                description="Cluster dimensions, centroid separations, and discovered dominant metadata properties."
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-border bg-surface-subtle/60 text-text-muted border-b font-mono text-[10.5px] uppercase">
                      <th className="px-3.5 py-2.5 font-medium">Cluster</th>
                      <th className="px-3.5 py-2.5 font-medium">Vector Count</th>
                      <th className="px-3.5 py-2.5 font-medium">Proportion</th>
                      <th className="px-3.5 py-2.5 font-medium">Intra-Cluster Dist</th>
                      <th className="px-3.5 py-2.5 font-medium">Nearest Neighbor Cluster</th>
                      <th className="px-3.5 py-2.5 font-medium">Dominant Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {result.clusters.map((c, idx) => (
                      <tr
                        key={c.cluster_id}
                        onClick={() => setSelectedCluster(c)}
                        className={`hover:bg-surface-subtle cursor-pointer transition-colors ${
                          selectedCluster?.cluster_id === c.cluster_id
                            ? 'bg-surface-subtle font-medium'
                            : ''
                        }`}
                      >
                        <td className="px-3.5 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: palette[idx % palette.length],
                              }}
                            />
                            <span className="font-sans font-medium text-foreground">
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2 font-mono font-medium text-foreground">
                          {c.size.toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2 font-mono text-text-secondary">
                          {c.percentage.toFixed(1)}%
                        </td>
                        <td className="px-3.5 py-2 font-mono text-text-secondary">
                          {c.mean_intra_distance.toFixed(4)}
                        </td>
                        <td className="px-3.5 py-2 font-mono text-text-secondary">
                          Cluster #{c.nearest_cluster_id} (d={c.nearest_cluster_distance?.toFixed(3)})
                        </td>
                        <td className="px-3.5 py-2 font-sans text-text-secondary max-w-[200px] truncate">
                          {Object.entries(c.dominant_metadata).length > 0
                            ? Object.entries(c.dominant_metadata)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')
                            : 'Mixed / Diverse'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Selected Cluster Detail Panel */}
            {selectedCluster && (
              <Panel>
                <PanelHeader
                  title={
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            palette[
                              (selectedCluster.cluster_id - 1) % palette.length
                            ],
                        }}
                      />
                      <span>
                        Cluster Inspector: <strong className="font-sans text-foreground">{selectedCluster.name}</strong>
                      </span>
                    </div>
                  }
                  description={`${selectedCluster.size.toLocaleString()} vectors (${selectedCluster.percentage.toFixed(1)}% of collection)`}
                  actions={
                    <button
                      type="button"
                      onClick={() => setSelectedCluster(null)}
                      className="text-text-muted hover:text-foreground hover:bg-surface-subtle flex h-6 w-6 items-center justify-center rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <PanelBody className="space-y-4 py-4">
                  {/* Dominant metadata breakdown */}
                  <div className="space-y-2">
                    <span className="text-text-secondary flex items-center gap-1 font-sans text-[11px] font-medium">
                      <Hash className="h-3.5 w-3.5 text-text-muted" /> Dominant Metadata Attributes
                    </span>
                    {Object.keys(selectedCluster.dominant_metadata).length > 0 ? (
                      <div className="border-border divide-border/60 divide-y rounded border text-[12px]">
                        {Object.entries(selectedCluster.dominant_metadata).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between p-2.5">
                            <span className="text-text-secondary font-mono text-[11px]">
                              {k}
                            </span>
                            <span className="text-foreground font-sans font-medium text-[11.5px]">
                              {v}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-muted font-sans text-[11.5px]">
                        No single metadata field reaches a majority threshold in this cluster.
                      </p>
                    )}
                  </div>

                  {/* Representative sample vector IDs */}
                  <div className="space-y-2">
                    <span className="text-text-secondary font-sans text-[11px] font-medium">
                      Representative Vector IDs (Closest to Centroid)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedCluster.sample_members.map((id) => (
                        <div
                          key={id}
                          className="border-border bg-surface-subtle rounded border px-2 py-1 font-mono text-[11px] text-foreground"
                        >
                          {id}
                        </div>
                      ))}
                    </div>
                  </div>
                </PanelBody>
              </Panel>
            )}

            {/* Quality Interpretation Notice */}
            <div className="border-border bg-surface-subtle/50 text-text-secondary flex items-start gap-2.5 rounded-md border p-3.5 text-[12px]">
              <Info className="text-accent mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <span className="text-foreground font-sans font-medium">
                  Mathematical Quality Index Definitions
                </span>
                <p className="leading-relaxed">
                  <strong>Silhouette Score</strong> ranges from -1 to +1; values approaching +1 indicate vectors are much closer to their assigned cluster than to neighboring clusters. <strong>Davies-Bouldin Index</strong> evaluates the ratio of intra-cluster scatter to inter-cluster separation; lower values signify tighter, better-separated partitions.
                </p>
                <div className="text-text-muted mt-2 flex items-center justify-between font-mono text-[11px]">
                  <span>Metric Space: {result.distance_metric.toUpperCase()}</span>
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

export default ClustersPanel;
