import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Play,
  Info,
  AlertTriangle,
  X,
  FileText,
  Hash,
} from 'lucide-react';
import { useCollectionStore } from '../../store/collection.store';
import { getProjection } from '../../service/analysis.service';
import type {
  AnalysisResponse,
  ProjectionPoint,
  ProjectionResult,
} from '../../store/analysis.types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LoadingState } from '../ui/loading-state';
import { CopyButton } from '../ui/copy-button';
import { EmbeddingScatterCanvas } from '../ui/embedding-scatter-canvas';

export const EmbeddingsPanel: React.FC = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);

  const [algorithm, setAlgorithm] = useState<'pca' | 'umap' | 'tsne'>('pca');
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [colorBy, setColorBy] = useState<string>('__uniform__');
  const [randomSeed] = useState<number>(42);
  const [selectedPoint, setSelectedPoint] = useState<ProjectionPoint | null>(null);

  const [data, setData] =
    useState<AnalysisResponse<ProjectionResult> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runProjection = useCallback(async () => {
    if (!activeCollection) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getProjection(
        activeCollection.name,
        algorithm,
        sampleSize,
        15,
        30.0,
        randomSeed,
      );
      setData(res);
      // Keep selected point if still in points list using functional update
      setSelectedPoint((prev) => {
        if (!prev) return null;
        return res.result.points.find((p) => p.id === prev.id) || null;
      });
    } catch (err: unknown) {
      console.error('Failed to compute projection', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to compute 2D embedding projection.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeCollection, algorithm, sampleSize, randomSeed]);

  useEffect(() => {
    runProjection();
  }, [runProjection]);

  // Extract metadata fields available for coloring
  const metadataFieldOptions = React.useMemo(() => {
    if (!data?.result?.points) return [];
    const fields = new Set<string>();
    for (const p of data.result.points.slice(0, 50)) {
      if (p.metadata) {
        Object.keys(p.metadata).forEach((k) => fields.add(k));
      }
    }
    return Array.from(fields);
  }, [data]);

  const result = data?.result;
  const explainedVar = result?.explained_variance;

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-5">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col space-y-4">
        {/* Header & Controls Toolbar */}
        <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-text-muted font-mono text-[10px] font-semibold tracking-wider uppercase">
                MANIFOLD PROJECTION
              </span>
              {/*<Badge variant="accent" size="xs" mono>
                {algorithm === 'pca' ? 'Phase 3 (PCA Baseline)' : 'Phase 4 (Non-Linear)'}
              </Badge>*/}
              {data && (
                <Badge variant="neutral" size="xs" mono>
                  {result?.points.length.toLocaleString()} points
                </Badge>
              )}
            </div>
            <h1 className="text-foreground flex items-center gap-2 font-sans text-[20px] font-semibold tracking-tight">
              <Compass className="text-accent h-5 w-5" />
              2D Embedding Visualization
            </h1>
          </div>

          {/* Projection & Coloring Parameters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Algorithm Switcher */}
            <div className="border-border bg-surface-subtle flex items-center rounded-md border p-0.5 text-[12px]">
              <button
                type="button"
                onClick={() => setAlgorithm('pca')}
                className={`rounded px-2.5 py-1 font-sans transition-colors ${
                  algorithm === 'pca'
                    ? 'bg-surface text-foreground font-medium shadow-sm'
                    : 'text-text-secondary hover:text-foreground'
                }`}
              >
                PCA (Linear)
              </button>
              <button
                type="button"
                onClick={() => setAlgorithm('umap')}
                className={`rounded px-2.5 py-1 font-sans transition-colors ${
                  algorithm === 'umap'
                    ? 'bg-surface text-foreground font-medium shadow-sm'
                    : 'text-text-secondary hover:text-foreground'
                }`}
              >
                UMAP (Manifold)
              </button>
              <button
                type="button"
                onClick={() => setAlgorithm('tsne')}
                className={`rounded px-2.5 py-1 font-sans transition-colors ${
                  algorithm === 'tsne'
                    ? 'bg-surface text-foreground font-medium shadow-sm'
                    : 'text-text-secondary hover:text-foreground'
                }`}
              >
                t-SNE
              </button>
            </div>

            {/* Color-by Selector */}
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="text-text-secondary font-sans font-medium">
                Color:
              </span>
              <select
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value)}
                className="bg-surface border-border text-foreground rounded border px-2.5 py-1 font-mono text-[11.5px]"
              >
                <option value="__uniform__">Uniform (Accent)</option>
                <option value="__norm__">L2 Vector Magnitude</option>
                {metadataFieldOptions.map((f) => (
                  <option key={f} value={f}>
                    Metadata: {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Sample Size Selector */}
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="text-text-secondary font-sans font-medium">
                Sample:
              </span>
              <select
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value))}
                className="bg-surface border-border text-foreground rounded border px-2.5 py-1 font-mono text-[11.5px]"
              >
                <option value={1000}>1,000</option>
                <option value={2500}>2,500</option>
                <option value={5000}>5,000</option>
                <option value={10000}>10,000</option>
                <option value={25000}>25,000</option>
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              isLoading={isLoading}
              leftIcon={<Play className="h-3.5 w-3.5" />}
              onClick={runProjection}
            >
              Compute
            </Button>
          </div>
        </div>

        {/* PCA Explained Variance Stats Header */}
        {algorithm === 'pca' && explainedVar && (
          <div className="border-border bg-surface-subtle/40 flex flex-wrap items-center justify-between gap-4 rounded-md border px-3.5 py-2 text-[12px]">
            <div className="flex items-center gap-4">
              <span className="text-text-secondary font-sans font-medium">
                Explained Variance Ratio:
              </span>
              <span className="text-foreground font-mono">
                PC1: <strong className="text-accent">{(explainedVar.pc1 * 100).toFixed(1)}%</strong>
              </span>
              <span className="text-border-strong">·</span>
              <span className="text-foreground font-mono">
                PC2: <strong className="text-accent">{(explainedVar.pc2 * 100).toFixed(1)}%</strong>
              </span>
              <span className="text-border-strong">·</span>
              <span className="text-foreground font-mono">
                Combined: <strong className="text-foreground">{(explainedVar.total * 100).toFixed(1)}%</strong>
              </span>
            </div>
            <div className="text-text-muted font-mono text-[10.5px]">
              Deterministic Principal Components
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="border-error/40 bg-error/10 text-error flex items-start gap-2.5 rounded-md border p-3 text-[12px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">Projection Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Main Canvas Workspace with Vector Inspector Sidebar */}
        <div className="relative flex min-h-0 flex-1 items-stretch gap-4">
          {/* Scatter Canvas */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            {isLoading && !result ? (
              <div className="flex h-full items-center justify-center">
                <LoadingState label={`Computing ${algorithm.toUpperCase()} 2D embedding projection in Python ML engine…`} />
              </div>
            ) : result ? (
              <EmbeddingScatterCanvas
                points={result.points}
                colorByField={colorBy === '__uniform__' ? null : colorBy}
                selectedPointId={selectedPoint?.id ?? null}
                onSelectPoint={setSelectedPoint}
              />
            ) : (
              <div className="border-border flex h-full items-center justify-center rounded-md border">
                <p className="text-text-muted font-mono text-[12px]">
                  No projection data generated.
                </p>
              </div>
            )}
          </div>

          {/* Right Vector Inspector Panel per DESIGN.md Section 25 */}
          {selectedPoint && (
            <div className="border-border bg-surface flex w-[320px] shrink-0 flex-col overflow-hidden rounded-md border shadow-sm">
              <div className="border-border flex h-10 items-center justify-between border-b px-3.5">
                <span className="text-text-muted font-mono text-[10.5px] font-semibold uppercase tracking-wider">
                  Vector Inspector
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPoint(null)}
                  className="text-text-muted hover:text-foreground hover:bg-surface-subtle flex h-6 w-6 items-center justify-center rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-3.5 text-[12px]">
                {/* ID & Norm */}
                <div className="space-y-1">
                  <span className="text-text-secondary font-sans text-[11px]">
                    Vector ID
                  </span>
                  <div className="border-border bg-surface-subtle flex items-center justify-between rounded border px-2 py-1 font-mono text-[11.5px]">
                    <span className="text-foreground truncate">{selectedPoint.id}</span>
                    <CopyButton text={selectedPoint.id} size="sm" label="Copy ID" />
                  </div>
                </div>

                {/* Numerical Properties */}
                <div className="border-border bg-surface-subtle/50 grid grid-cols-2 gap-2 rounded border p-2 text-[11.5px]">
                  <div>
                    <span className="text-text-muted text-[10.5px]">2D Projection</span>
                    <div className="text-foreground font-mono">
                      ({selectedPoint.x.toFixed(2)}, {selectedPoint.y.toFixed(2)})
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10.5px]">L2 Norm</span>
                    <div className="text-foreground font-mono">
                      {selectedPoint.norm.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Document Content */}
                {selectedPoint.document && (
                  <div className="space-y-1">
                    <span className="text-text-secondary flex items-center gap-1 font-sans text-[11px] font-medium">
                      <FileText className="h-3.5 w-3.5 text-text-muted" /> Document Content
                    </span>
                    <div className="border-border bg-surface-subtle max-h-36 overflow-y-auto rounded border p-2 font-mono text-[11px] leading-relaxed select-text">
                      {selectedPoint.document}
                    </div>
                  </div>
                )}

                {/* Metadata Attributes */}
                {selectedPoint.metadata && Object.keys(selectedPoint.metadata).length > 0 && (
                  <div className="space-y-1">
                    <span className="text-text-secondary flex items-center gap-1 font-sans text-[11px] font-medium">
                      <Hash className="h-3.5 w-3.5 text-text-muted" /> Metadata Fields
                    </span>
                    <div className="border-border divide-border/60 max-h-48 divide-y overflow-y-auto rounded border text-[11.5px]">
                      {Object.entries(selectedPoint.metadata).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between p-2">
                          <span className="text-text-secondary font-mono text-[11px] truncate max-w-[100px]">
                            {k}
                          </span>
                          <span className="text-foreground font-mono text-[11px] truncate max-w-[150px]">
                            {String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Methodological / Mathematical Notice */}
        <div className="text-text-muted flex items-center justify-between font-mono text-[10.5px]">
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-accent" />
            <span>
              2D projection is a visual approximation. Proximity in 2D does not replace original embedding-space distance.
            </span>
          </span>
          {data && <span>Execution: {data.execution_time_ms.toFixed(1)}ms</span>}
        </div>
      </div>
    </div>
  );
};

export default EmbeddingsPanel;
