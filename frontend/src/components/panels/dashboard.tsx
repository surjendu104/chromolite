import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { getCollectionByName } from '../../service/collection.service';
import { useCollectionStore } from '../../store/collection.store';
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
} from 'lucide-react';
import { CopyButton } from '../ui/copy-button';
import { Metric } from '../ui/metric';
import { Panel, PanelHeader, PanelBody } from '../ui/panel';
import { Badge } from '../ui/badge';
import { LoadingState } from '../ui/loading-state';

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
    return () => {
      cancelled = true;
    };
  }, [activeCollection, setDetails]);

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
                        className="hover:bg-surface-subtle/60 transition-colors"
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
      </div>
    </div>
  );
};

export default DashboardPanel;
