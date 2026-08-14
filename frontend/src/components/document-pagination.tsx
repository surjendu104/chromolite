import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Pagination } from '../store/collection.store';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

type DocumentPaginationProps = {
  pagination: Pagination;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
};

const DocumentPagination = ({
  pagination,
  pageSize,
  onPageSizeChange,
  onPageChange,
}: DocumentPaginationProps) => {
  if (pagination.total === 0) return null;

  const start = (pagination.page - 1) * pageSize + 1;
  const end = Math.min(pagination.page * pageSize, pagination.total);

  return (
    <div className="border-border text-muted-foreground flex shrink-0 items-center justify-between border-t px-5 py-2 text-[12px]">
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Rows per page"
          className="border-border bg-background text-foreground focus:ring-ring cursor-pointer rounded-md border px-1.5 py-0.5 text-[12px] outline-none focus:ring-1"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} rows
            </option>
          ))}
        </select>
      </div>

      <span className="tabular-nums">
        {start}–{end} of {pagination.total.toLocaleString()}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPrevious}
          aria-label="Previous page"
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            pagination.hasPrevious
              ? 'hover:bg-muted text-foreground'
              : 'cursor-not-allowed opacity-30',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[48px] text-center font-mono tabular-nums">
          {pagination.page} / {pagination.totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNext}
          aria-label="Next page"
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            pagination.hasNext
              ? 'hover:bg-muted text-foreground'
              : 'cursor-not-allowed opacity-30',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DocumentPagination;
