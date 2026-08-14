import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { SortOption } from '../lib/document-utils';

export type ActiveFilter = { key: string; value: string };

type DocumentToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  activeFilters: ActiveFilter[];
  onAddFilter: (filter: ActiveFilter) => void;
  onRemoveFilter: (key: string) => void;
  availableFilterKeys: Record<string, string[]>;
  onRefresh: () => void;
  isRefreshing?: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'default', label: 'Default order' },
  { value: 'id-asc', label: 'ID (A → Z)' },
  { value: 'id-desc', label: 'ID (Z → A)' },
  { value: 'content-asc', label: 'Content (A → Z)' },
];

const DocumentToolbar = ({
  searchQuery,
  onSearchChange,
  sort,
  onSortChange,
  activeFilters,
  onAddFilter,
  onRemoveFilter,
  availableFilterKeys,
  onRefresh,
  isRefreshing,
  searchInputRef,
}: DocumentToolbarProps) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterKey, setFilterKey] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  const filterKeys = Object.keys(availableFilterKeys);
  const filterValues = filterKey ? (availableFilterKeys[filterKey] ?? []) : [];

  const handleAddFilter = (key: string, value: string) => {
    onAddFilter({ key, value });
    setFilterOpen(false);
    setFilterKey('');
  };

  return (
    <div className="border-border shrink-0 space-y-2 border-b px-5 py-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents…"
            aria-label="Search documents"
            className={cn(
              'border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border py-1.5 pr-12 pl-8 text-[13px]',
              'focus:border-ring focus:ring-ring/30 focus:ring-1 focus:outline-none',
            )}
          />
          <kbd className="text-muted-foreground border-border bg-muted pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded px-1 py-0.5 font-mono text-[10px]">
            /
          </kbd>
        </div>

        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => {
              setFilterOpen(!filterOpen);
              setSortOpen(false);
            }}
            className={cn(
              'border-border hover:bg-muted inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-[12px] transition-colors',
              activeFilters.length > 0 && 'border-ring/40',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>

          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setFilterOpen(false)}
              />
              <motion.div
                className="border-border bg-popover text-popover-foreground absolute top-full right-0 z-20 mt-1 w-56 rounded-lg border p-2 shadow-md"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              >
                {filterKeys.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-1.5 text-[12px]">
                    No metadata fields on this page
                  </p>
                ) : !filterKey ? (
                  <div className="scrollbar-thumb-foreground/30 max-h-48 scrollbar-thin overflow-y-auto">
                    {filterKeys.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFilterKey(key)}
                        className="hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-[12px]"
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setFilterKey('')}
                      className="text-muted-foreground hover:text-foreground mb-1 text-[11px]"
                    >
                      ← {filterKey}
                    </button>
                    <div className="scrollbar-thumb-foreground/30 max-h-48 scrollbar-thin overflow-y-auto">
                      {filterValues.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleAddFilter(filterKey, value)}
                          className="hover:bg-muted w-full rounded-md px-2 py-1.5 text-left font-mono text-[12px]"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSortOpen(!sortOpen);
              setFilterOpen(false);
            }}
            className="border-border hover:bg-muted inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-[12px] transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>

          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSortOpen(false)}
              />
              <motion.div
                className="border-border bg-popover absolute top-full right-0 z-20 mt-1 w-44 rounded-lg border p-1 shadow-md"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onSortChange(opt.value);
                      setSortOpen(false);
                    }}
                    className={cn(
                      'hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-[12px]',
                      sort === opt.value &&
                        'text-accent-interactive font-medium',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh documents"
          title="Refresh"
          className="border-border hover:bg-muted inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
          />
        </button>
      </div>

      {(activeFilters.length > 0 || filterKeys.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <AnimatePresence initial={false}>
            {activeFilters.map((filter) => (
              <motion.span
                key={filter.key}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.14 }}
                className="border-border bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]"
              >
                <span className="text-muted-foreground">{filter.key}:</span>
                <span className="font-medium">{filter.value}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFilter(filter.key)}
                  aria-label={`Remove filter ${filter.key}`}
                  className="text-muted-foreground hover:text-foreground ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {filterKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-[11px] transition-colors"
            >
              <Plus className="h-3 w-3" />
              Filter
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentToolbar;
