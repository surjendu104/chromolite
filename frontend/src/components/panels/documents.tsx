import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { FileText } from 'lucide-react';
import { getDocuments } from '../../service/document.service';
import { getCollectionByName } from '../../service/collection.service';
import {
  useCollectionStore,
  type Document,
} from '../../store/collection.store';
import { toPagination } from '../../mappers/pagination';
import {
  filterDocuments,
  sortDocuments,
  getAvailableFilterKeys,
  type SortOption,
} from '../../lib/document-utils';
import CollectionHeader from '../collection-header';
import DocumentToolbar, { type ActiveFilter } from '../document-toolbar';
import DocumentRow from '../document-row';
import DocumentPagination from '../document-pagination';
import DocumentInspector from '../document-inspector';

const DocumentPanel = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const documents = useCollectionStore((s) => s.documents);
  const setDocuments = useCollectionStore((s) => s.setDocuments);
  const pagination = useCollectionStore((s) => s.pagination);
  const setPagination = useCollectionStore((s) => s.setPagination);
  const setActiveCollectionDetails = useCollectionStore(
    (s) => s.setActiveCollectionDetails,
  );

  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('default');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [lastCollectionId, setLastCollectionId] = useState<string | null>(
    activeCollection?.id ?? null,
  );
  if (activeCollection?.id !== lastCollectionId) {
    setLastCollectionId(activeCollection?.id ?? null);
    setSelectedDocument(null);
    setSearchQuery('');
    setActiveFilters([]);
    setSort('default');
  }

  const fetchDocuments = useCallback(
    async (page: number, size: number) => {
      if (!activeCollection?.name) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getDocuments(activeCollection.name, page, size);
        setDocuments(response.data);
        setPagination(toPagination(response.pagination));
      } catch (err) {
        console.error(err);
        setError('The collection could not be read.');
      } finally {
        setIsLoading(false);
      }
    },
    [activeCollection, setDocuments, setPagination],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDocuments(pagination.page, pageSize);
    setIsRefreshing(false);
  }, [fetchDocuments, pagination.page, pageSize]);

  useEffect(() => {
    if (!activeCollection) return;
    let cancelled = false;
    getCollectionByName(activeCollection.name)
      .then((res) => {
        if (!cancelled) setActiveCollectionDetails(res);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [activeCollection, setActiveCollectionDetails]);

  useEffect(() => {
    if (activeCollection) {
      // Data fetching is a legitimate effect; state updates follow the request.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDocuments(1, pageSize);
    }
  }, [activeCollection, fetchDocuments, pageSize]);

  const filterMap = useMemo(
    () => Object.fromEntries(activeFilters.map((f) => [f.key, f.value])),
    [activeFilters],
  );

  const displayedDocuments = useMemo(() => {
    const filtered = filterDocuments(documents, searchQuery, filterMap);
    return sortDocuments(filtered, sort);
  }, [documents, searchQuery, filterMap, sort]);

  const availableFilterKeys = useMemo(
    () => getAvailableFilterKeys(documents),
    [documents],
  );

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
  };

  const handleCloseInspector = () => {
    setSelectedDocument(null);
  };

  const handleAddFilter = (filter: ActiveFilter) => {
    setActiveFilters((prev) => [
      ...prev.filter((f) => f.key !== filter.key),
      filter,
    ]);
  };

  const handleRemoveFilter = (key: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.key !== key));
  };

  const selectedDocIndex = selectedDocument
    ? (pagination.page - 1) * pageSize +
      documents.findIndex((d) => d.id === selectedDocument.id)
    : 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape' && selectedDocument) {
        e.preventDefault();
        handleCloseInspector();
        return;
      }

      if (isInput) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, displayedDocuments.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        const doc = displayedDocuments[focusedIndex];
        if (doc) handleDocumentSelect(doc);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDocument, displayedDocuments, focusedIndex]);

  if (!activeCollection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-[13px]">
            Select a collection to explore documents
          </p>
        </div>
      </div>
    );
  }

  const hasFilters = searchQuery.trim() || activeFilters.length > 0;
  const showEmptySearch =
    hasFilters && displayedDocuments.length === 0 && !isLoading;
  const showEmptyCollection =
    !hasFilters &&
    pagination.total === 0 &&
    documents.length === 0 &&
    !isLoading;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <CollectionHeader />

        <DocumentToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sort={sort}
          onSortChange={setSort}
          activeFilters={activeFilters}
          onAddFilter={handleAddFilter}
          onRemoveFilter={handleRemoveFilter}
          availableFilterKeys={availableFilterKeys}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          searchInputRef={searchInputRef}
        />

        <div
          ref={listRef}
          className="scrollbar-thumb-foreground/30 min-h-0 flex-1 scrollbar-thin overflow-y-auto"
        >
          {error && (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
              <p className="text-foreground text-[14px] font-medium">
                Couldn&apos;t load documents
              </p>
              <p className="text-muted-foreground text-[13px]">{error}</p>
              <button
                type="button"
                onClick={() => fetchDocuments(pagination.page, pageSize)}
                className="border-border hover:bg-muted mt-2 rounded-md border px-3 py-1 text-[12px] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading && !error && (
            <div className="space-y-0 px-0 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-border border-b px-5 py-4">
                  <div className="bg-muted mb-2 h-4 w-1/3 animate-pulse rounded" />
                  <div className="bg-muted/60 mb-1 h-3 w-full animate-pulse rounded" />
                  <div className="bg-muted/40 h-3 w-2/3 animate-pulse rounded" />
                </div>
              ))}
            </div>
          )}

          {showEmptyCollection && (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
              <FileText className="text-muted-foreground h-6 w-6 opacity-50" />
              <p className="text-foreground text-[14px] font-medium">
                No documents
              </p>
              <p className="text-muted-foreground text-[13px]">
                This collection doesn&apos;t contain any documents yet.
              </p>
            </div>
          )}

          {showEmptySearch && (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
              <p className="text-foreground text-[14px] font-medium">
                No matching documents
              </p>
              <p className="text-muted-foreground text-[13px]">
                Try a different search or remove a filter.
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            displayedDocuments.map((doc, i) => {
              const globalIndex = (pagination.page - 1) * pageSize + i;
              return (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  index={globalIndex}
                  isSelected={selectedDocument?.id === doc.id}
                  isFocused={focusedIndex === i}
                  onClick={() => handleDocumentSelect(doc)}
                  onFocus={() => setFocusedIndex(i)}
                />
              );
            })}
        </div>

        {!error && (
          <DocumentPagination
            pagination={pagination}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) => fetchDocuments(page, pageSize)}
          />
        )}
      </div>

      <AnimatePresence>
        {selectedDocument && (
          <DocumentInspector
            key="panel"
            document={selectedDocument}
            index={Math.max(0, selectedDocIndex)}
            onClose={handleCloseInspector}
            variant="panel"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedDocument && (
          <DocumentInspector
            key="overlay"
            document={selectedDocument}
            index={Math.max(0, selectedDocIndex)}
            onClose={handleCloseInspector}
            variant="overlay"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentPanel;
