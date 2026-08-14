import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { getCollectionByName } from '../../service/collection.service';
import { useCollectionStore } from '../../store/collection.store';
import {
  Settings2,
  Server,
  Globe,
  Type,
  Binary,
  Percent,
  ToggleLeft,
  Hash,
  ListTree,
  Box,
} from 'lucide-react';
import { CopyButton } from '../ui/copy-button';
import { SectionLabel } from '../ui/section-label';

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

const StatItem = ({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) => (
  <div className="border-border border-b py-3 last:border-b-0">
    <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
      {label}
    </dt>
    <dd className="text-foreground mt-1 font-mono text-[20px] font-semibold tracking-tight tabular-nums">
      {value}
    </dd>
  </div>
);

const ConfigRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null;
}) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-muted-foreground text-[12px]">{label}</span>
    <span className="text-foreground font-mono text-[12px]">
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
        <p className="text-muted-foreground text-[13px]">
          Select a collection to view details
        </p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2 text-[13px]">
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
  const configJson = details.configuration as {
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
    <div className="scrollbar-thumb-foreground/30 flex h-full scrollbar-thin flex-col overflow-y-auto">
      <header className="border-border border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-foreground text-[15px] font-semibold tracking-tight">
              {details.name}
            </h1>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[12px]">
              <span className="inline-flex items-center gap-1">
                <Server className="h-3 w-3" />
                {details.database}
              </span>
              <span className="opacity-30">·</span>
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {details.tenant}
              </span>
            </div>
          </div>
          {/*<span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
            <span className="bg-success h-1.5 w-1.5 rounded-full" />
            Active
          </span>*/}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[220px_1fr]">
        <aside className="border-border border-b px-6 py-5 lg:border-r lg:border-b-0">
          <dl>
            <StatItem label="Documents" value={details.document_count} />
            <StatItem label="Schema keys" value={keys.length} />
            <StatItem label="Indexes" value={enabledIndexCount} />
            <StatItem
              label="Forks"
              value={Object.keys(details.fork_count).length}
            />
          </dl>
        </aside>

        <div className="min-w-0 space-y-6 px-6 py-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <SectionLabel>Schema</SectionLabel>
              <span className="text-muted-foreground text-[11px]">
                {keys.length} keys
              </span>
            </div>

            <div className="border-border overflow-hidden rounded-lg border">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-4 py-2 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Key
                    </th>
                    <th className="text-muted-foreground px-4 py-2 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Type
                    </th>
                    <th className="text-muted-foreground px-4 py-2 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Index
                    </th>
                    {/*<th className="text-muted-foreground px-4 py-2 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Status
                    </th>*/}
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
                    // let indexEnabled = false;
                    if (primaryType) {
                      const indexes = Object.entries(primaryType[1]).filter(
                        ([, v]) => v !== null,
                      );
                      const enabled = indexes.find(([, v]) => v && v.enabled);
                      indexName = enabled
                        ? enabled[0].replace(/_/g, ' ')
                        : (indexes[0]?.[0]?.replace(/_/g, ' ') ?? '—');
                      // indexEnabled = enabled?.[1]?.enabled ?? false;
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
                                'font-mono text-[12px]',
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
                          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12px]">
                            <TypeIcon className="h-3.5 w-3.5" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-foreground font-mono text-[12px]">
                            {indexName}
                          </span>
                        </td>
                        {/*<td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[12px]',
                              indexEnabled
                                ? 'text-foreground'
                                : 'text-muted-foreground/50',
                            )}
                          >
                            <Circle
                              className={cn(
                                'h-1.5 w-1.5 fill-current',
                                indexEnabled
                                  ? 'text-success'
                                  : 'text-muted-foreground/30',
                              )}
                            />
                            {indexEnabled ? 'Active' : 'Inactive'}
                          </span>
                        </td>*/}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Settings2 className="text-muted-foreground h-3.5 w-3.5" />
                <SectionLabel>HNSW</SectionLabel>
              </div>
              <div className="border-border rounded-lg border px-4 py-2">
                <ConfigRow label="Space" value={configJson.hnsw.space} />
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

            <div className="space-y-5">
              <div>
                <SectionLabel className="mb-3">Embedding Function</SectionLabel>
                <div className="border-border rounded-lg border px-4 py-2">
                  <ConfigRow
                    label="Type"
                    value={configJson.embedding_function?.type ?? null}
                  />
                </div>
              </div>

              <div>
                <SectionLabel className="mb-3">Index Defaults</SectionLabel>
                <div className="border-border rounded-lg border px-4 py-2">
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
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12px]">
                          <meta.icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <span className="text-foreground font-mono text-[12px]">
                          {enabled}/{indexes.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <SectionLabel className="mb-2">Collection ID</SectionLabel>
                <div className="border-border bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2">
                  <code className="text-muted-foreground flex-1 truncate font-mono text-[11px]">
                    {details.id}
                  </code>
                  <CopyButton text={details.id} label="Copy collection ID" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
