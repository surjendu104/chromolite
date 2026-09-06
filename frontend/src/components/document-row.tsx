import { cn } from '../lib/utils';
import {
  getDocumentPreview,
  getDocumentTitle,
  getMetadataPreview,
  truncateId,
} from '../lib/document-utils';
import type { Document } from '../store/collection.store';
import { Badge } from './ui/badge';

type DocumentRowProps = {
  document: Document;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
  onFocus: () => void;
};

export const DocumentRow = ({
  document,
  index,
  isSelected,
  isFocused,
  onClick,
  onFocus,
}: DocumentRowProps) => {
  const title = getDocumentTitle(document, index);
  const preview = getDocumentPreview(document);
  const metadataPreview = getMetadataPreview(document.metadata);

  return (
    <button
      type="button"
      onClick={onClick}
      onFocus={onFocus}
      className={cn(
        'group border-border flex w-full cursor-pointer flex-col gap-1.5 border-b px-5 py-3 text-left transition-colors',
        'hover:bg-surface-subtle/70 focus-visible:ring-accent focus-visible:ring-1 focus-visible:outline-none',
        isSelected && 'bg-surface-subtle border-l-accent border-l-2 pl-[18px]',
        isFocused && !isSelected && 'bg-surface-subtle/50',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-foreground font-sans text-[13.5px] leading-snug font-medium">
          {title}
        </span>
        <span
          className="text-text-muted group-hover:text-text-secondary shrink-0 font-mono text-[11px] select-none"
          title={document.id}
        >
          {truncateId(document.id, 20)}
        </span>
      </div>

      {preview && (
        <p className="text-text-secondary line-clamp-2 font-sans text-[12.5px] leading-relaxed">
          {preview}
        </p>
      )}

      {metadataPreview.length > 0 && (
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {metadataPreview.slice(0, 4).map((val, idx) => (
            <Badge key={idx} variant="neutral" size="xs">
              {val}
            </Badge>
          ))}
          {document.embedding && document.embedding.length > 0 && (
            <span className="text-text-muted ml-auto font-mono text-[10.5px]">
              {document.embedding.length}d
            </span>
          )}
        </div>
      )}
    </button>
  );
};

export default DocumentRow;
