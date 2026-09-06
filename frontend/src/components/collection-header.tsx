import { useCollectionStore } from '../store/collection.store';
import { Badge } from './ui/badge';
import { CopyButton } from './ui/copy-button';

export const CollectionHeader = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);
  const pagination = useCollectionStore((s) => s.pagination);
  const documents = useCollectionStore((s) => s.documents);

  if (!activeCollection) return null;

  const total = details?.document_count ?? pagination.total;
  const embeddingDim =
    documents.length > 0
      ? documents[0].embedding.length
      : ((details?.metadata?.embedding_dimension as number | undefined) ??
        null);

  const configHnsw = (
    details?.configuration as { hnsw?: { space?: string } } | undefined
  )?.hnsw;
  const metricSpace = configHnsw?.space || 'cosine';

  return (
    <header className="border-border bg-surface flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted font-mono text-[11px] tracking-wider uppercase">
            COLLECTION /
          </span>
          <h1 className="text-foreground truncate font-sans text-[15px] font-semibold tracking-tight">
            {activeCollection.name}
          </h1>
        </div>
        <CopyButton
          text={activeCollection.name}
          label="Copy collection name"
          size="sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral" size="sm" mono>
          {total.toLocaleString()} vectors
        </Badge>

        {embeddingDim !== null && (
          <Badge variant="neutral" size="sm" mono>
            {embeddingDim} dim
          </Badge>
        )}

        {metricSpace && (
          <Badge variant="accent" size="sm" mono>
            {metricSpace}
          </Badge>
        )}

        {details?.database && (
          <Badge variant="neutral" size="sm">
            db: {details.database}
          </Badge>
        )}
      </div>
    </header>
  );
};

export default CollectionHeader;
