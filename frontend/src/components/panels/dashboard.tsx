import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { getCollectionByName } from '../../service/collection.service';
import { useCollectionStore } from '../../store/collection.store';
import {
  Database,
  FileText,
  Braces,
  Zap,
  GitFork,
  Settings2,
  Server,
  Globe,
  KeyRound,
  Copy,
  Check,
  Type,
  Binary,
  Percent,
  ToggleLeft,
  Layers,
  Circle,
  Hash,
  ListTree,
  Box,
} from 'lucide-react';

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

const typeMeta: Record<
  string,
  { label: string; icon: typeof Hash; color: string }
> = {
  string: { label: 'String', icon: Type, color: 'text-chart-1' },
  int_value: { label: 'Integer', icon: Binary, color: 'text-chart-2' },
  float_value: { label: 'Float', icon: Percent, color: 'text-chart-3' },
  boolean: { label: 'Boolean', icon: ToggleLeft, color: 'text-chart-4' },
  float_list: { label: 'Vector', icon: ListTree, color: 'text-chart-5' },
  sparse_vector: { label: 'Sparse', icon: Box, color: 'text-chart-1' },
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        'rounded p-0.5 transition-colors',
        copied
          ? 'text-green-500'
          : 'text-muted-foreground/50 hover:text-foreground',
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  accent: string;
}) => (
  <div className="border-border bg-card rounded-lg border p-3.5">
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div className={cn('rounded-md p-1.5', accent)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
    </div>
    <p className="text-foreground mt-2 text-xl font-semibold tracking-tight">
      {value}
    </p>
  </div>
);

const ConfigRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null;
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className="text-foreground font-mono text-xs">
      {value === null ? (
        <span className="text-muted-foreground/40">—</span>
      ) : (
        String(value)
      )}
    </span>
  </div>
);

const DashboardPanel = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);
  const setDetails = useCollectionStore((s) => s.setActiveCollectionDetails);

  useEffect(() => {
    if (!activeCollection) return;
    let cancelled = false;
    getCollectionByName(activeCollection.name)
      .then((res) => {
        if (!cancelled) setDetails(res);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [activeCollection, setDetails]);

  if (!activeCollection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select a collection to view details
        </p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <div className="border-muted-foreground/20 border-t-muted-foreground h-4 w-4 animate-spin rounded-full border-2" />
          Loading collection details…
        </div>
      </div>
    );
  }

  const schema = details.schema as {
    defaults: Record<string, SchemaTypeConfig>;
    keys: Record<string, SchemaKeyData>;
  };
  const configJson = details.configuration_json as {
    hnsw: HnswConfig;
    spann: unknown;
    embedding_function: { type: string } | null;
  };

  const keys = Object.entries(schema.keys);
  const defaults = Object.entries(schema.defaults);

  const enabledIndexCount = defaults.reduce((acc, [, typeConfig]) => {
    if (!typeConfig) return acc;
    return (
      acc +
      Object.values(typeConfig).filter(
        (idx): idx is SchemaIndex => idx !== null && idx.enabled,
      ).length
    );
  }, 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-border border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Database className="text-primary h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-foreground text-base font-semibold">
                {details.name}
              </h1>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px]">
                <Server className="h-3 w-3" />
                <span>{details.database}</span>
                <span className="opacity-30">·</span>
                <Globe className="h-3 w-3" />
                <span>{details.tenant}</span>
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Documents"
            value={details.document_count}
            icon={FileText}
            accent="bg-chart-1/10 text-chart-1"
          />
          <StatCard
            label="Keys"
            value={keys.length}
            icon={Braces}
            accent="bg-chart-2/10 text-chart-2"
          />
          <StatCard
            label="Indexes"
            value={enabledIndexCount}
            icon={Zap}
            accent="bg-chart-3/10 text-chart-3"
          />
          <StatCard
            label="Forks"
            value={Object.keys(details.fork_count).length}
            icon={GitFork}
            accent="bg-chart-4/10 text-chart-4"
          />
        </div>

        {/* Two Column */}
        <div className="grid grid-cols-5 gap-5">
          {/* Schema Keys — 3 cols */}
          <div className="col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground flex items-center gap-2 text-sm font-medium">
                <Layers className="text-muted-foreground h-4 w-4" />
                Schema
              </h2>
              <span className="text-muted-foreground text-[11px]">
                {keys.length} keys
              </span>
            </div>

            <div className="border-border overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-border border-b">
                    <th className="text-muted-foreground px-4 py-2 text-left text-[11px] font-medium tracking-wider uppercase">
                      Key
                    </th>
                    <th className="text-muted-foreground px-4 py-2 text-left text-[11px] font-medium tracking-wider uppercase">
                      Type
                    </th>
                    <th className="text-muted-foreground px-4 py-2 text-left text-[11px] font-medium tracking-wider uppercase">
                      Index
                    </th>
                    <th className="text-muted-foreground px-4 py-2 text-left text-[11px] font-medium tracking-wider uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(([keyName, keyData]) => {
                    const activeTypes = Object.entries(keyData).filter(
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
                    let indexEnabled = false;
                    if (primaryType) {
                      const indexes = Object.entries(primaryType[1]).filter(
                        ([, v]) => v !== null,
                      );
                      const enabled = indexes.find(([, v]) => v && v.enabled);
                      indexName = enabled
                        ? enabled[0].replace(/_/g, ' ')
                        : (indexes[0]?.[0]?.replace(/_/g, ' ') ?? '—');
                      indexEnabled = enabled?.[1]?.enabled ?? false;
                    }

                    const isInternal = keyName.startsWith('#');

                    return (
                      <tr
                        key={keyName}
                        className="border-border hover:bg-muted/30 border-b transition-colors last:border-b-0"
                      >
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2">
                            {isInternal ? (
                              <Box className="text-muted-foreground/50 h-3.5 w-3.5" />
                            ) : (
                              <Hash className="text-muted-foreground/50 h-3.5 w-3.5" />
                            )}
                            <span
                              className={cn(
                                'font-mono text-xs',
                                isInternal
                                  ? 'text-muted-foreground'
                                  : 'text-foreground',
                              )}
                            >
                              {keyName}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <TypeIcon
                              className={cn('h-3.5 w-3.5', meta.color)}
                            />
                            <span className="text-muted-foreground">
                              {meta.label}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-foreground font-mono text-xs">
                            {indexName}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs',
                              indexEnabled
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-muted-foreground/50',
                            )}
                          >
                            <Circle
                              className={cn(
                                'h-1.5 w-1.5 fill-current',
                                indexEnabled
                                  ? 'text-green-500'
                                  : 'text-muted-foreground/30',
                              )}
                            />
                            {indexEnabled ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Config — 2 cols */}
          <div className="col-span-2 space-y-3">
            <h2 className="text-foreground flex items-center gap-2 text-sm font-medium">
              <Settings2 className="text-muted-foreground h-4 w-4" />
              Configuration
            </h2>

            {/* HNSW */}
            <div className="border-border bg-card rounded-lg border">
              <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-foreground text-xs font-medium">
                  HNSW
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                  <span className="h-1 w-1 rounded-full bg-green-500" />
                  {configJson.hnsw.space}
                </span>
              </div>
              <div className="px-4 py-1.5">
                <ConfigRow
                  label="ef Construction"
                  value={configJson.hnsw.ef_construction}
                />
                <ConfigRow
                  label="ef Search"
                  value={configJson.hnsw.ef_search}
                />
                <ConfigRow
                  label="Max Neighbors"
                  value={configJson.hnsw.max_neighbors}
                />
                <ConfigRow
                  label="Resize Factor"
                  value={configJson.hnsw.resize_factor}
                />
                <ConfigRow
                  label="Sync Threshold"
                  value={configJson.hnsw.sync_threshold}
                />
              </div>
            </div>

            {/* Embedding Function */}
            <div className="border-border bg-card rounded-lg border">
              <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-foreground text-xs font-medium">
                  Embedding Function
                </span>
              </div>
              <div className="px-4 py-1.5">
                <ConfigRow
                  label="Type"
                  value={configJson.embedding_function?.type ?? null}
                />
              </div>
            </div>

            {/* Index Defaults */}
            <div className="border-border bg-card rounded-lg border">
              <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-foreground text-xs font-medium">
                  Index Defaults
                </span>
              </div>
              <div className="px-4 py-1.5">
                {defaults.map(([type, typeConfig]) => {
                  if (!typeConfig) return null;
                  const indexes = Object.values(typeConfig).filter(
                    (v): v is SchemaIndex => v !== null,
                  );
                  const enabled = indexes.filter((v) => v.enabled).length;
                  const meta = typeMeta[type];
                  if (!meta) return null;
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <meta.icon className={cn('h-3 w-3', meta.color)} />
                        <span className="text-muted-foreground">
                          {meta.label}
                        </span>
                      </span>
                      <span className="text-foreground font-mono text-xs">
                        {enabled}/{indexes.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collection ID */}
            <div className="border-border bg-card rounded-lg border px-4 py-3">
              <div className="text-muted-foreground mb-2 flex items-center gap-1.5">
                <KeyRound className="h-3 w-3" />
                <span className="text-[11px]">Collection ID</span>
              </div>
              <div className="bg-muted/50 flex items-center gap-2 rounded px-2.5 py-1.5">
                <code className="text-foreground flex-1 truncate font-mono text-[11px]">
                  {details.id}
                </code>
                <CopyButton text={details.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
