import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Pagination } from '../store/collection.store';
import { Button } from './ui/button';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

type DocumentPaginationProps = {
  pagination: Pagination;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
};

export const DocumentPagination = ({
  pagination,
  pageSize,
  onPageSizeChange,
  onPageChange,
}: DocumentPaginationProps) => {
  if (pagination.total === 0) return null;

  const start = (pagination.page - 1) * pageSize + 1;
  const end = Math.min(pagination.page * pageSize, pagination.total);

  return (
    <footer className="border-border bg-surface text-text-secondary flex shrink-0 items-center justify-between border-t px-5 py-2 text-[12px] select-none">
      {/* Page Size Selection */}
      <div className="flex items-center gap-2">
        <span className="text-text-muted font-sans text-[11.5px]">Show:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Rows per page"
          className="border-border bg-surface text-foreground focus:border-accent cursor-pointer rounded-md border px-2 py-0.5 font-mono text-[11.5px] focus:outline-none"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} rows
            </option>
          ))}
        </select>
      </div>

      {/* Range Status */}
      <div className="text-text-secondary font-mono text-[11.5px] tabular-nums">
        <span className="text-foreground font-medium">
          {start.toLocaleString()}
        </span>
        <span className="text-text-muted mx-1">–</span>
        <span className="text-foreground font-medium">
          {end.toLocaleString()}
        </span>
        <span className="text-text-muted mx-1.5">of</span>
        <span className="text-foreground font-medium">
          {pagination.total.toLocaleString()}
        </span>
        <span className="text-text-muted ml-1">items</span>
      </div>

      {/* Page Controls */}
      <div className="flex items-center gap-1.5">
        <Button
          size="xs"
          variant="outline"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPrevious}
          aria-label="Previous page"
          className="h-6 w-6 p-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="text-foreground px-1 font-mono text-[11px] tabular-nums">
          {pagination.page} / {pagination.totalPages}
        </span>

        <Button
          size="xs"
          variant="outline"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNext}
          aria-label="Next page"
          className="h-6 w-6 p-0"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </footer>
  );
};

export default DocumentPagination;
