import { useEffect, useCallback, useState } from 'react';
import { getDocuments } from '../../service/document.service';
import {
  useCollectionStore,
  type Document,
} from '../../store/collection.store';
import { cn } from '../../lib/utils';
import {
  Database,
  FileText,
  MoveLeft,
  MoveRight,
  RefreshCcw,
} from 'lucide-react';
import { toPagination } from '../../mappers/pagination';
import DocumentViewer from '../document-viewer';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

const DocumentPanel = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const documents = useCollectionStore((s) => s.documents);
  const setDocuments = useCollectionStore((s) => s.setDocuments);
  const pagination = useCollectionStore((s) => s.pagination);
  const setPagination = useCollectionStore((s) => s.setPagination);
  const [pageSize, setPageSize] = useState(10);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [openDocumentViewer, setOpenDocumentViewer] = useState(false);

  const toggleDocumentViewer = () => {
    setOpenDocumentViewer(!openDocumentViewer);
  };

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
    setOpenDocumentViewer(true);
  };

  const fetchDocuments = useCallback(
    async (page: number, size: number) => {
      if (!activeCollection?.name) return;
      try {
        const response = await getDocuments(activeCollection.name, page, size);
        setDocuments(response.data);
        setPagination(toPagination(response.pagination));
      } catch (error) {
        console.error(error);
      }
    },
    [activeCollection, setDocuments, setPagination],
  );

  useEffect(() => {
    if (activeCollection) fetchDocuments(1, pageSize);
  }, [activeCollection, fetchDocuments, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
  };

  if (!activeCollection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select a collection to view documents
        </p>
      </div>
    );
  }

  if (pagination.total === 0 && documents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <FileText className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">No documents found</p>
      </div>
    );
  }

  const start = (pagination.page - 1) * pageSize + 1;
  const end = Math.min(pagination.page * pageSize, pagination.total);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className=" flex items-center justify-between p-4">
          <div className="flex items-baseline justify-start gap-2 text-sm font-medium">
            <span className="text-foreground flex items-center gap-1">
              <Database className="h-4 w-4" />
              {activeCollection.name}
            </span>
            <span className="text-foreground flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {pagination.total}
            </span>
            <button
              className={cn(
                'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm text-sm',
                'hover:bg-sidebar-accent',
              )}
            >
              <RefreshCcw
                onClick={() => fetchDocuments(1, pageSize)}
                className="h-4 w-4"
              />
            </button>
          </div>

          <div className="h-fit w-fit flex gap-2 justify-center items-center">
            {/* Pagination */}
            {pagination.total > 0 && (
              <div className=" flex items-center justify-end px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">
                    {start}–{end} of {pagination.total}
                  </span>
                  <div className="bg-border h-3.5 w-px" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-sm">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="border-border bg-card text-foreground focus:ring-ring cursor-pointer rounded border px-1.5 py-0.5 text-sm font-medium outline-none focus:ring-1"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
    
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchDocuments(pagination.page - 1, pageSize)}
                    disabled={!pagination.hasPrevious}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1 rounded-md p-2.5 text-xs font-medium transition-colors',
                      pagination.hasPrevious
                        ? 'text-foreground hover:bg-muted'
                        : 'text-muted-foreground/40 cursor-not-allowed',
                    )}
                  >
                    <MoveLeft className="h-4 w-4" />
                    {/*Prev*/}
                  </button>
                  <span className="text-muted-foreground min-w-[60px] text-center text-xs">
                    {pagination.page}/{pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchDocuments(pagination.page + 1, pageSize)}
                    disabled={!pagination.hasNext}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1 rounded-md p-2.5 text-xs font-medium transition-colors',
                      pagination.hasNext
                        ? 'text-foreground hover:bg-muted'
                        : 'text-muted-foreground/40 cursor-not-allowed',
                    )}
                  >
                    {/*Next*/}
                    <MoveRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto scrollbar-thin p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-border border-b">
                <th className="text-foreground w-5 border border-gray-300 px-4 py-2.5 text-center text-sm font-bold tracking-wider">
                  Id
                </th>
                <th className="text-foreground border border-gray-300 px-4 py-2.5 text-center text-sm font-bold tracking-wider">
                  Document
                </th>
                <th className="text-foreground border border-gray-300 px-4 py-2.5 text-center text-sm font-bold tracking-wider">
                  Metadata
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className={cn(
                    'border-border border-b last:border-b-0',
                    'hover:bg-muted/30 transition-colors duration-150',
                  )}
                  onClick={() => handleDocumentClick(doc)}
                >
                  <td className="text-foreground/70 max-w-[180px] truncate border border-gray-300 px-4 py-3 font-mono text-xs">
                    {doc.id}
                  </td>
                  <td className="text-foreground max-w-[400px] border border-gray-300 px-4 py-3">
                    <p className="line-clamp-2 leading-relaxed">
                      {doc.document}
                    </p>
                  </td>
                  <td className="max-w-[250px] border border-gray-300 px-4 py-3 font-mono">
                    <div className="truncate">
                      {JSON.stringify(doc.metadata)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openDocumentViewer && selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={toggleDocumentViewer}
        />
      )}
    </div>
  );
};

export default DocumentPanel;
