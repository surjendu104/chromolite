import { cn } from '../lib/utils';
import {
  getDocumentPreview,
  getDocumentTitle,
  getMetadataPreview,
  truncateId,
} from '../lib/document-utils';
import type { Document } from '../store/collection.store';

type DocumentRowProps = {
  document: Document;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
  onFocus: () => void;
};

const DocumentRow = ({
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
        'group border-border hover:bg-muted/40 flex w-full cursor-pointer flex-col gap-1 border-b px-5 py-3 text-left transition-colors',
        'focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none',
        isSelected &&
          'bg-muted/60 border-l-accent-interactive border-l-2 pl-[18px]',
        isFocused && !isSelected && 'bg-muted/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-foreground text-[14px] leading-snug font-medium">
          {title}
        </span>
      </div>

      {preview && (
        <p className="text-muted-foreground line-clamp-2 text-[13px] leading-relaxed">
          {preview}
        </p>
      )}

      <div className="mt-0.5 flex items-center justify-between gap-3">
        <span
          className="text-muted-foreground/70 font-mono text-[11px]"
          title={document.id}
        >
          {truncateId(document.id)}
        </span>
        {metadataPreview.length > 0 && (
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {metadataPreview.join(' · ')}
          </span>
        )}
      </div>
    </button>
  );
};

export default DocumentRow;
