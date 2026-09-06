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
import { LoadingState } from '../ui/loading-state';
import { EmptyState } from '../ui/empty-state';
import { ErrorState } from '../ui/error-state';

export const DocumentPanel = () => {
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
        console.error('Failed to load documents', err);
        setError('The ChromaDB collection documents could not be read.');
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
      .catch((err) => {
        console.error('Failed to update details', err);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCollection, setActiveCollectionDetails]);

  useEffect(() => {
    if (activeCollection) {
      // Data fetching effect
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
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="No collection selected"
          description="Select a ChromaDB collection from the sidebar to inspect its documents and embeddings."
        />
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
    <div className="bg-background flex h-full min-h-0">
      {/* Document Explorer Main View */}
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

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          {error && (
            <div className="py-12">
              <ErrorState
                title="Could not read documents"
                message={error}
                onRetry={() => fetchDocuments(pagination.page, pageSize)}
              />
            </div>
          )}

          {isLoading && !error && <LoadingState variant="skeleton" rows={6} />}

          {showEmptyCollection && (
            <div className="py-16">
              <EmptyState
                icon={FileText}
                title="Empty collection"
                description="This collection does not contain any stored vectors or documents."
              />
            </div>
          )}

          {showEmptySearch && (
            <div className="py-16">
              <EmptyState
                title="No matching documents"
                description="No records match the current query or active metadata filters."
                action={{
                  label: 'Clear search filters',
                  onClick: () => {
                    setSearchQuery('');
                    setActiveFilters([]);
                  },
                }}
              />
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

      {/* Right Drawer Inspector (Desktop Panel & Mobile Overlay) */}
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
