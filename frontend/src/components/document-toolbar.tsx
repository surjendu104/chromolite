import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Filter,
  ArrowUpDown,
  RefreshCw,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { SortOption } from '../lib/document-utils';
import { SearchInput } from './ui/input';
import { Button } from './ui/button';

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

export const DocumentToolbar = ({
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
    <div className="border-border bg-surface shrink-0 space-y-2 border-b px-5 py-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchInput
            ref={searchInputRef}
            value={searchQuery}
            onChange={onSearchChange}
            onClear={() => onSearchChange('')}
            placeholder="Search documents and metadata..."
            shortcut="/"
          />
        </div>

        {/* Filter Popover */}
        <div className="relative" ref={filterRef}>
          <Button
            size="md"
            variant="secondary"
            onClick={() => {
              setFilterOpen(!filterOpen);
              setSortOpen(false);
            }}
            leftIcon={<Filter className="text-text-muted h-3.5 w-3.5" />}
            className={cn(
              'h-8 text-[12.5px]',
              activeFilters.length > 0 &&
                'border-accent/60 text-accent font-medium',
            )}
          >
            <span>Filter</span>
            {activeFilters.length > 0 && (
              <span className="bg-accent-subtle text-accent py-0.2 rounded px-1.5 font-mono text-[10px]">
                {activeFilters.length}
              </span>
            )}
          </Button>

          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setFilterOpen(false)}
              />
              <motion.div
                className="border-border bg-surface-elevated shadow-popover absolute top-full right-0 z-30 mt-1 w-60 rounded-lg border p-2"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
              >
                {filterKeys.length === 0 ? (
                  <p className="text-text-muted px-2 py-2 text-center font-sans text-[12px]">
                    No metadata fields on this page
                  </p>
                ) : !filterKey ? (
                  <div>
                    <div className="text-text-muted mb-1 px-2 py-1 font-mono text-[10px] tracking-wider uppercase">
                      Select Filter Field
                    </div>
                    <div className="max-h-48 space-y-0.5 overflow-y-auto">
                      {filterKeys.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFilterKey(key)}
                          className="text-foreground hover:bg-surface-subtle flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] transition-colors"
                        >
                          <span className="font-sans">{key}</span>
                          <span className="text-text-muted font-mono text-[10px]">
                            {availableFilterKeys[key]?.length} values
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setFilterKey('')}
                      className="text-text-secondary hover:text-foreground mb-1.5 flex cursor-pointer items-center gap-1 text-[11px] font-medium transition-colors"
                    >
                      <span>←</span> Back to fields
                    </button>
                    <div className="text-text-muted border-border mb-1 border-t px-1 py-1 font-mono text-[10px] tracking-wider uppercase">
                      {filterKey} values
                    </div>
                    <div className="max-h-48 space-y-0.5 overflow-y-auto">
                      {filterValues.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleAddFilter(filterKey, value)}
                          className="text-foreground hover:bg-surface-subtle flex w-full cursor-pointer items-center truncate rounded-md px-2 py-1.5 text-left font-mono text-[12px] transition-colors"
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

        {/* Sort Selector */}
        <div className="relative">
          <Button
            size="md"
            variant="secondary"
            onClick={() => {
              setSortOpen(!sortOpen);
              setFilterOpen(false);
            }}
            leftIcon={<ArrowUpDown className="text-text-muted h-3.5 w-3.5" />}
            rightIcon={<ChevronDown className="text-text-muted h-3 w-3" />}
            className="h-8 text-[12.5px]"
          >
            <span>Sort</span>
          </Button>

          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setSortOpen(false)}
              />
              <motion.div
                className="border-border bg-surface-elevated shadow-popover absolute top-full right-0 z-30 mt-1 w-48 rounded-lg border p-1"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
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
                      'flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left font-sans text-[12px] transition-colors',
                      sort === opt.value
                        ? 'bg-surface-subtle text-accent font-medium'
                        : 'text-foreground hover:bg-surface-subtle',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>

        {/* Refresh Button */}
        <Button
          size="md"
          variant="secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh documents"
          title="Refresh collection documents"
          className="h-8 w-8 px-0"
        >
          <RefreshCw
            className={cn(
              'text-text-muted h-3.5 w-3.5',
              isRefreshing && 'text-accent animate-spin',
            )}
          />
        </Button>
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-text-muted mr-1 font-mono text-[10px] tracking-wider uppercase">
            Active filters:
          </span>
          <AnimatePresence initial={false}>
            {activeFilters.map((filter) => (
              <motion.span
                key={filter.key}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="border-accent-border bg-accent-subtle inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px]"
              >
                <span className="text-text-secondary font-sans">
                  {filter.key}:
                </span>
                <span className="text-foreground font-mono font-medium">
                  {filter.value}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFilter(filter.key)}
                  aria-label={`Remove filter ${filter.key}`}
                  className="text-text-muted hover:text-foreground cursor-pointer transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="text-text-muted hover:text-foreground ml-1 inline-flex cursor-pointer items-center gap-1 font-sans text-[11px] transition-colors"
          >
            <Plus className="h-3 w-3" /> Add filter
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentToolbar;
