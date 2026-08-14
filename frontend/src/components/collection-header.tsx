import { useCollectionStore } from '../store/collection.store';

const CollectionHeader = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);
  const pagination = useCollectionStore((s) => s.pagination);
  const documents = useCollectionStore((s) => s.documents);

  if (!activeCollection) return null;

  const total = details?.document_count ?? pagination.total;
  const embeddingDim =
    documents.length > 0 ? documents[0].embedding.length : null;

  return (
    <header className="border-border shrink-0 border-b px-5 py-4">
      <h1 className="text-foreground text-[15px] font-semibold tracking-tight">
        {activeCollection.name}
      </h1>
      <p className="text-muted-foreground mt-0.5 text-[13px]">
        {total.toLocaleString()} document{total !== 1 ? 's' : ''}
        {embeddingDim !== null && (
          <>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="font-mono">{embeddingDim}</span>
            <span>-dimensional embeddings</span>
          </>
        )}
      </p>
    </header>
  );
};

export default CollectionHeader;
