import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { getCollectionByName } from '../../service/collection.service';
import {
  getCollectionHealth,
  getMetadataAnalysis,
  getTemporalDrift,
} from '../../service/analysis.service';
import { useCollectionStore } from '../../store/collection.store';
import type {
  AnalysisResponse,
  CollectionHealthResult,
  MetadataAnalysisResult,
  TemporalDriftResult,
} from '../../store/analysis.types';
import {
  Settings2,
  Globe,
  Type,
  Binary,
  Percent,
  ToggleLeft,
  Hash,
  ListTree,
  Box,
  Database,
  Activity,
  AlertTriangle,
  Info,
  Calendar,
  X,
} from 'lucide-react';
import { CopyButton } from '../ui/copy-button';
import { Metric } from '../ui/metric';
import { Panel, PanelHeader, PanelBody } from '../ui/panel';
import { Badge } from '../ui/badge';
import { LoadingState } from '../ui/loading-state';
import { DistributionHistogram } from '../ui/distribution-histogram';
import { StatsTable } from '../ui/stats-table';

type SchemaIndex = { enabled: boolean; config: Record<string, unknown> };
type SchemaTypeConfig = Record<string, SchemaIndex | null> | null;
type SchemaKeyData = Record<string, SchemaTypeConfig>;
type HnswConfig = {
  space: string;
  ef_construction: number;
  ef_search: number;
  max_neighbors: number;
  resize_factor: number;
  sync_threshold: number;
};

const typeMeta: Record<string, { label: string; icon: typeof Hash }> = {
  string: { label: 'String', icon: Type },
  int_value: { label: 'Integer', icon: Binary },
  float_value: { label: 'Float', icon: Percent },
  boolean: { label: 'Boolean', icon: ToggleLeft },
  float_list: { label: 'Vector', icon: ListTree },
  sparse_vector: { label: 'Sparse', icon: Box },
};

const ConfigRow = ({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  mono?: boolean;
}) => (
  <div className="border-border/60 flex items-center justify-between border-b py-2 text-[12.5px] last:border-b-0">
    <span className="text-text-secondary font-sans">{label}</span>
    <span
      className={cn(
        'text-foreground font-medium',
        mono ? 'font-mono text-[12px]' : 'font-sans',
      )}
    >
      {value === null || value === undefined ? (
        <span className="text-text-muted font-mono">—</span>
      ) : (
        String(value)
      )}
    </span>
  </div>
);

export const DashboardPanel = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);
  const setDetails = useCollectionStore((s) => s.setActiveCollectionDetails);
  const documents = useCollectionStore((s) => s.documents);

  const [healthData, setHealthData] = useState<AnalysisResponse<CollectionHealthResult> | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const [temporalData, setTemporalData] = useState<AnalysisResponse<TemporalDriftResult> | null>(null);
  const [, setLoadingTemporal] = useState(false);

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [fieldAnalysis, setFieldAnalysis] = useState<AnalysisResponse<MetadataAnalysisResult> | null>(null);
  const [loadingFieldAnalysis, setLoadingFieldAnalysis] = useState(false);

  useEffect(() => {
    if (!activeCollection) return;
    let cancelled = false;
    getCollectionByName(activeCollection.name)
      .then((res) => {
        if (!cancelled) setDetails(res);
      })
      .catch((err) => {
        console.error('Failed to load collection details', err);
      });

    setLoadingHealth(true);
    getCollectionHealth(activeCollection.name)
      .then((res) => {
        if (!cancelled) setHealthData(res);
      })
      .catch((err) => {
        console.error('Failed to load collection health', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingHealth(false);
      });

    setLoadingTemporal(true);
    getTemporalDrift(activeCollection.name)
      .then((res) => {
        if (!cancelled && res.result.total_windows > 1) {
          setTemporalData(res);
        }
      })
      .catch((err) => {
        console.debug('Temporal drift not available', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingTemporal(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCollection, setDetails]);

  const handleInspectField = (fieldName: string) => {
    if (!activeCollection) return;
    setSelectedField(fieldName);
    setLoadingFieldAnalysis(true);
    getMetadataAnalysis(activeCollection.name, fieldName)
      .then((res) => {
        setFieldAnalysis(res);
      })
      .catch((err) => {
        console.error('Failed to analyze metadata field', err);
      })
      .finally(() => {
        setLoadingFieldAnalysis(false);
      });
  };

  if (!activeCollection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-secondary text-[13px]">
          Select a collection to view details
        </p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState label="Loading collection schema and configuration…" />
      </div>
    );
  }

  const schema = (details.schema as {
    defaults?: Record<string, SchemaTypeConfig>;
    keys?: Record<string, SchemaKeyData>;
  }) || { defaults: {}, keys: {} };

  const configJson = (details.configuration as {
    hnsw?: HnswConfig;
    embedding_function?: { type?: string; [key: string]: unknown } | null;
    [key: string]: unknown;
  }) || {
    hnsw: {
      space: 'cosine',
      ef_construction: 100,
      ef_search: 10,
      max_neighbors: 16,
      resize_factor: 1.2,
      sync_threshold: 1000,
    },
  };

  const hnsw = configJson.hnsw || {
    space: 'cosine',
    ef_construction: 100,
    ef_search: 10,
    max_neighbors: 16,
    resize_factor: 1.2,
    sync_threshold: 1000,
  };

  const keys = Object.entries(schema.keys || {});
  const defaults = Object.entries(schema.defaults || {});

  const enabledIndexCount = defaults.reduce((acc, [, typeConfig]) => {
    if (!typeConfig) return acc;
    return (
      acc +
      Object.values(typeConfig).filter(
        (idx): idx is SchemaIndex => idx !== null && idx.enabled,
      ).length
    );
  }, 0);

  const embeddingDim =
    documents.length > 0
      ? documents[0].embedding.length
      : ((details.metadata?.embedding_dimension as number | undefined) ?? null);

  return (
    <div className="bg-background h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Collection Identity Card */}
        <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-text-muted font-mono text-[10px] font-semibold tracking-wider uppercase">
                CHROMA COLLECTION
              </span>
              <Badge variant="success" size="xs" dot>
                Online
              </Badge>
            </div>
            <h1 className="text-foreground font-sans text-[22px] font-bold tracking-tight">
              {details.name}
            </h1>
            <div className="text-text-secondary mt-2 flex flex-wrap items-center gap-3 text-[12px]">
              <span className="inline-flex items-center gap-1.5">
                <Database className="text-text-muted h-3.5 w-3.5" />
                <span className="font-sans">{details.database}</span>
              </span>
              <span className="text-border-strong">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="text-text-muted h-3.5 w-3.5" />
                <span className="font-sans">{details.tenant}</span>
              </span>
              <span className="text-border-strong">·</span>
              <span className="text-text-muted inline-flex items-center gap-1 font-mono text-[11px]">
                <span>id:</span>
                <span className="max-w-[180px] truncate">{details.id}</span>
                <CopyButton
                  text={details.id}
                  label="Copy Collection ID"
                  size="sm"
                />
              </span>
            </div>
          </div>
        </div>

        {/* Top Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <Panel subtle className="p-4">
            <Metric
              label="Vector Count"
              value={details.document_count.toLocaleString()}
              description="Stored embeddings"
              size="standard"
            />
          </Panel>

          <Panel subtle className="p-4">
            <Metric
              label="Dimensions"
              value={embeddingDim !== null ? String(embeddingDim) : '—'}
              description="Vector length"
              size="standard"
            />
          </Panel>

          <Panel subtle className="p-4">
            <Metric
              label="Distance Metric"
              value={hnsw.space.toUpperCase()}
              description="Index metric space"
              size="standard"
            />
          </Panel>

          <Panel subtle className="p-4">
            <Metric
              label="Schema Keys"
              value={keys.length}
              description={`${enabledIndexCount} active indexes`}
              size="standard"
            />
          </Panel>
        </div>

        {/* Collection Health & Embedding Norm Distribution (Phase 1) */}
        <Panel>
          <PanelHeader
            title={
              <div className="flex items-center gap-2">
                <Activity className="text-accent h-4 w-4" />
                <span>Collection Health & Embedding Norms</span>
              </div>
            }
            description="L2 vector magnitude distribution, unit-normalization status, and numerical validation"
            actions={
              healthData?.result ? (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      healthData.result.health_status === 'healthy'
                        ? 'success'
                        : healthData.result.health_status === 'warning'
                          ? 'warning'
                          : 'error'
                    }
                    size="xs"
                    dot
                  >
                    {healthData.result.health_status === 'healthy'
                      ? 'Healthy'
                      : healthData.result.health_status === 'warning'
                        ? 'Warning'
                        : 'Action Required'}
                  </Badge>
                  <Badge variant="neutral" size="xs" mono>
                    {healthData.result.is_unit_normalized
                      ? 'Unit Normalized (||v|| ≈ 1.0)'
                      : 'Varying Magnitudes'}
                  </Badge>
                  <Badge variant="neutral" size="xs" mono>
                    {healthData.method === 'exact' ? 'Exact' : `Sampled (${healthData.computed_on.toLocaleString()})`}
                  </Badge>
                </div>
              ) : null
            }
          />
          <PanelBody className="space-y-4 py-4">
            {loadingHealth && !healthData ? (
              <div className="py-8">
                <LoadingState label="Computing vector norms and health statistics…" />
              </div>
            ) : healthData?.result ? (
              <>
                {/* Health / Anomaly Alerts */}
                {healthData.result.anomalies.length > 0 && (
                  <div className="border-warning/40 bg-warning/10 text-text-primary flex items-start gap-2.5 rounded-md border p-3 text-[12px]">
                    <AlertTriangle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <span className="font-sans font-medium text-warning">
                        Diagnostic Observations
                      </span>
                      <ul className="list-disc space-y-0.5 pl-4 text-text-secondary text-[11.5px]">
                        {healthData.result.anomalies.map((anomaly, idx) => (
                          <li key={idx}>{anomaly}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Norm Histogram */}
                <div className="border-border bg-surface-subtle/30 rounded-md border p-3.5">
                  <DistributionHistogram
                    data={healthData.result.norm_histogram}
                    label="L2 Embedding Magnitude Distribution"
                    median={healthData.result.norms.median}
                    p05={healthData.result.norms.p05}
                    p95={healthData.result.norms.p95}
                    height={130}
                  />
                </div>

                {/* Exact Norm Percentiles Table */}
                <StatsTable stats={healthData.result.norms} decimals={4} />

                {/* Educational / Mathematical Explainability Footer */}
                <div className="text-text-muted flex items-center justify-between font-mono text-[11px] pt-1">
                  <span className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    <span>Formula: ||v||₂ = √(∑ vᵢ²)</span>
                  </span>
                  <span>Execution: {healthData.execution_time_ms.toFixed(1)}ms</span>
                </div>
              </>
            ) : (
              <p className="text-text-muted text-[12px] py-4 text-center">
                Collection health diagnostics unavailable.
              </p>
            )}
          </PanelBody>
        </Panel>

        {/* Two-Column Technical Sections: HNSW Index & Embedding Config */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* HNSW Index Configuration */}
          <Panel>
            <PanelHeader
              title={
                <div className="flex items-center gap-2">
                  <Settings2 className="text-accent h-4 w-4" />
                  <span>HNSW Index Configuration</span>
                </div>
              }
              description="Vector search index parameters"
            />
            <PanelBody className="py-2">
              <ConfigRow label="Distance Metric (space)" value={hnsw.space} />
              <ConfigRow label="ef Construction" value={hnsw.ef_construction} />
              <ConfigRow label="ef Search" value={hnsw.ef_search} />
              <ConfigRow label="Max Neighbors (M)" value={hnsw.max_neighbors} />
              <ConfigRow label="Resize Factor" value={hnsw.resize_factor} />
              <ConfigRow label="Sync Threshold" value={hnsw.sync_threshold} />
            </PanelBody>
          </Panel>

          {/* Embedding Function & Index Defaults */}
          <div className="space-y-5">
            <Panel>
              <PanelHeader
                title="Embedding Function"
                description="Vectorization pipeline definition"
              />
              <PanelBody className="py-2">
                <ConfigRow
                  label="Function Provider / Type"
                  value={
                    configJson.embedding_function?.type ||
                    'Default (Chroma / ONNX)'
                  }
                  mono={false}
                />
                <ConfigRow
                  label="Vector Dimension"
                  value={
                    embeddingDim ? `${embeddingDim} dimensions` : 'Inferred'
                  }
                />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Index Defaults by Type"
                description="Metadata indexing policies"
              />
              <PanelBody className="py-2">
                {defaults.length === 0 ? (
                  <p className="text-text-muted py-1 text-[12px]">
                    No default indexes configured
                  </p>
                ) : (
                  defaults.map(([type, typeConfig]) => {
                    if (!typeConfig) return null;
                    const indexes = Object.values(typeConfig).filter(
                      (v): v is SchemaIndex => v !== null,
                    );
                    const enabled = indexes.filter((v) => v.enabled).length;
                    const meta = typeMeta[type];
                    if (!meta) return null;
                    const Icon = meta.icon;

                    return (
                      <div
                        key={type}
                        className="border-border/50 flex items-center justify-between border-b py-1.5 text-[12.5px] last:border-b-0"
                      >
                        <span className="text-text-secondary inline-flex items-center gap-1.5 font-sans">
                          <Icon className="text-text-muted h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                        <span className="text-foreground font-mono text-[12px]">
                          {enabled}/{indexes.length} active
                        </span>
                      </div>
                    );
                  })
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>

        {/* Schema Explorer Table */}
        <Panel>
          <PanelHeader
            title="Metadata Schema & Keys"
            description="Field data types, indexing statuses, and key configurations"
            actions={
              <Badge variant="neutral" size="sm" mono>
                {keys.length} fields
              </Badge>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-border bg-surface-subtle/50 text-text-muted border-b font-mono text-[11px] tracking-wider uppercase select-none">
                  <th className="px-4 py-2.5 font-medium">Field / Key</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Index</th>
                  <th className="px-4 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-border/70 divide-y font-sans">
                {keys.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-text-muted px-4 py-6 text-center"
                    >
                      No metadata keys discovered in schema
                    </td>
                  </tr>
                ) : (
                  keys.map(([keyName, keyData]) => {
                    const activeTypes = Object.entries(keyData || {}).filter(
                      ([, v]) => v !== null,
                    ) as [
                      string,
                      SchemaTypeConfig & Record<string, SchemaIndex>,
                    ][];
                    const primaryType = activeTypes[0];
                    const typeName = primaryType?.[0] ?? 'string';
                    const meta = typeMeta[typeName] ?? typeMeta.string;
                    const TypeIcon = meta.icon;

                    let indexName = '—';
                    let isIndexed = false;
                    if (primaryType) {
                      const indexes = Object.entries(
                        primaryType[1] || {},
                      ).filter(([, v]) => v !== null);
                      const enabled = indexes.find(([, v]) => v && v.enabled);
                      if (enabled) {
                        indexName = enabled[0].replace(/_/g, ' ');
                        isIndexed = true;
                      } else if (indexes.length > 0) {
                        indexName = indexes[0][0].replace(/_/g, ' ');
                      }
                    }

                    const isInternal = keyName.startsWith('#');

                    return (
                      <tr
                        key={keyName}
                        onClick={() => handleInspectField(keyName)}
                        className="hover:bg-surface-subtle/80 cursor-pointer transition-colors"
                        title="Click to inspect metadata category purity, NMI, or numeric distribution"
                      >
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2">
                            {isInternal ? (
                              <Box className="text-text-muted h-3.5 w-3.5" />
                            ) : (
                              <Hash className="text-accent h-3.5 w-3.5 opacity-80" />
                            )}
                            <span
                              className={cn(
                                'font-mono text-[12px]',
                                isInternal
                                  ? 'text-text-muted italic'
                                  : 'text-foreground font-medium',
                              )}
                            >
                              {keyName}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-text-secondary inline-flex items-center gap-1.5">
                            <TypeIcon className="text-text-muted h-3.5 w-3.5" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-foreground font-mono text-[12px] capitalize">
                            {indexName}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge
                            variant={isIndexed ? 'success' : 'neutral'}
                            size="xs"
                          >
                            {isIndexed ? 'Indexed' : 'Standard'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Temporal Dynamics & Centroid Drift (Phase 11) */}
        {temporalData?.result && temporalData.result.total_windows > 1 && (
          <Panel>
            <PanelHeader
              title={
                <div className="flex items-center gap-2">
                  <Calendar className="text-accent h-4 w-4" />
                  <span>Temporal Embedding Dynamics & Centroid Drift</span>
                </div>
              }
              description={`Centroid drift across ${temporalData.result.total_windows} ${temporalData.result.granularity} windows (field: '${temporalData.result.timestamp_field}')`}
              actions={
                <Badge variant="neutral" size="xs" mono>
                  Mean Drift: {temporalData.result.mean_consecutive_drift.toFixed(4)}
                </Badge>
              }
            />
            <PanelBody className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Panel subtle className="p-3">
                  <span className="text-text-muted text-[11px] font-sans">Timestamp Field</span>
                  <div className="text-foreground font-mono font-semibold text-[13px] mt-0.5">
                    {temporalData.result.timestamp_field}
                  </div>
                </Panel>
                <Panel subtle className="p-3">
                  <span className="text-text-muted text-[11px] font-sans">Time Granularity</span>
                  <div className="text-foreground font-mono font-semibold text-[13px] capitalize mt-0.5">
                    {temporalData.result.granularity}
                  </div>
                </Panel>
                <Panel subtle className="p-3">
                  <span className="text-text-muted text-[11px] font-sans">Mean Window Drift</span>
                  <div className="text-accent font-mono font-semibold text-[13px] mt-0.5">
                    {temporalData.result.mean_consecutive_drift.toFixed(4)}
                  </div>
                </Panel>
                <Panel subtle className="p-3">
                  <span className="text-text-muted text-[11px] font-sans">Max Drift Window</span>
                  <div className="text-warning font-mono font-semibold text-[13px] mt-0.5 truncate">
                    {temporalData.result.max_drift_window || '—'}
                  </div>
                </Panel>
              </div>

              {/* Timeline Windows Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-border bg-surface-subtle/50 text-text-muted border-b font-mono text-[10.5px] uppercase">
                      <th className="px-3.5 py-2 font-medium">Window</th>
                      <th className="px-3.5 py-2 font-medium">Date Span</th>
                      <th className="px-3.5 py-2 font-medium">Vectors</th>
                      <th className="px-3.5 py-2 font-medium">Centroid Drift</th>
                      <th className="px-3.5 py-2 font-medium">Mean Norm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y font-mono text-[11.5px]">
                    {temporalData.result.windows.map((w) => (
                      <tr key={w.window_label} className="hover:bg-surface-subtle/50">
                        <td className="px-3.5 py-2 text-foreground font-semibold">
                          {w.window_label}
                        </td>
                        <td className="px-3.5 py-2 text-text-secondary text-[11px] font-sans">
                          {w.start_time} → {w.end_time}
                        </td>
                        <td className="px-3.5 py-2 text-foreground">
                          {w.vector_count.toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2">
                          {w.centroid_drift_from_previous !== null && w.centroid_drift_from_previous !== undefined ? (
                            <span className={cn(
                              w.window_label === temporalData.result.max_drift_window
                                ? 'text-warning font-bold'
                                : 'text-text-secondary'
                            )}>
                              {w.centroid_drift_from_previous.toFixed(4)}
                              {w.window_label === temporalData.result.max_drift_window ? ' (max)' : ''}
                            </span>
                          ) : (
                            <span className="text-text-muted">Baseline</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 text-text-secondary">
                          {w.mean_norm.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelBody>
          </Panel>
        )}

        {/* Selected Metadata Field Analysis Inspector (Phase 10) */}
        {selectedField && (
          <Panel>
            <PanelHeader
              title={
                <div className="flex items-center gap-2">
                  <Hash className="text-accent h-4 w-4" />
                  <span>
                    Metadata Semantic Alignment: <strong className="font-mono text-foreground">{selectedField}</strong>
                  </span>
                </div>
              }
              description="Evaluates whether metadata categories align with high-dimensional embedding geometry"
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setSelectedField(null);
                    setFieldAnalysis(null);
                  }}
                  className="text-text-muted hover:text-foreground hover:bg-surface-subtle flex h-6 w-6 items-center justify-center rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              }
            />
            <PanelBody className="space-y-4 py-4">
              {loadingFieldAnalysis ? (
                <div className="py-6">
                  <LoadingState label={`Analyzing '${selectedField}' category dispersion and cluster purity…`} />
                </div>
              ) : fieldAnalysis?.result ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12px]">
                    <Panel subtle className="p-2.5">
                      <span className="text-text-muted text-[10.5px]">Field Type</span>
                      <div className="text-foreground font-mono font-semibold text-[12.5px] capitalize mt-0.5">
                        {fieldAnalysis.result.field_type}
                      </div>
                    </Panel>
                    <Panel subtle className="p-2.5">
                      <span className="text-text-muted text-[10.5px]">Vector Coverage</span>
                      <div className="text-foreground font-mono font-semibold text-[12.5px] mt-0.5">
                        {(fieldAnalysis.result.coverage_rate * 100).toFixed(1)}% ({fieldAnalysis.result.total_vectors_with_field.toLocaleString()} vecs)
                      </div>
                    </Panel>
                    <Panel subtle className="p-2.5">
                      <span className="text-text-muted text-[10.5px]">Cluster Purity</span>
                      <div className="text-accent font-mono font-semibold text-[12.5px] mt-0.5">
                        {fieldAnalysis.result.cluster_purity !== null && fieldAnalysis.result.cluster_purity !== undefined
                          ? `${(fieldAnalysis.result.cluster_purity * 100).toFixed(1)}%`
                          : '—'}
                      </div>
                    </Panel>
                    <Panel subtle className="p-2.5">
                      <span className="text-text-muted text-[10.5px]">Mutual Info (NMI)</span>
                      <div className="text-foreground font-mono font-semibold text-[12.5px] mt-0.5">
                        {fieldAnalysis.result.normalized_mutual_information !== null && fieldAnalysis.result.normalized_mutual_information !== undefined
                          ? fieldAnalysis.result.normalized_mutual_information.toFixed(3)
                          : '—'}
                      </div>
                    </Panel>
                  </div>

                  {/* Interpretation message */}
                  <p className="text-text-secondary text-[12.5px] leading-relaxed">
                    {fieldAnalysis.result.interpretation}
                  </p>

                  {/* Categories Breakdown Table if categorical */}
                  {fieldAnalysis.result.categories && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-border bg-surface-subtle text-text-muted border-b font-mono text-[10.5px] uppercase">
                            <th className="px-3 py-2 font-medium">Category / Label</th>
                            <th className="px-3 py-2 font-medium">Count</th>
                            <th className="px-3 py-2 font-medium">Proportion</th>
                            <th className="px-3 py-2 font-medium">Intra-Category Radius</th>
                            <th className="px-3 py-2 font-medium">Mean Norm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                          {fieldAnalysis.result.categories.map((cat) => (
                            <tr key={cat.name} className="hover:bg-surface-subtle/50">
                              <td className="px-3 py-2 font-sans font-medium text-foreground">
                                {cat.name}
                              </td>
                              <td className="px-3 py-2 font-mono text-foreground">
                                {cat.count.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 font-mono text-text-secondary">
                                {cat.percentage.toFixed(1)}%
                              </td>
                              <td className="px-3 py-2 font-mono text-text-secondary">
                                {cat.mean_distance_to_centroid.toFixed(4)}
                              </td>
                              <td className="px-3 py-2 font-mono text-text-muted">
                                {cat.norm_mean.toFixed(3)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Numeric Stats Table if numeric */}
                  {fieldAnalysis.result.numeric_stats && (
                    <StatsTable stats={fieldAnalysis.result.numeric_stats.stats} decimals={3} />
                  )}
                </>
              ) : null}
            </PanelBody>
          </Panel>
        )}
      </div>
    </div>
  );
};

export default DashboardPanel;
