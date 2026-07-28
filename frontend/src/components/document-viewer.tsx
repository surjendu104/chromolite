import { useState } from 'react';
import type { Document } from '../store/collection.store';
import { cn } from '../lib/utils';
import {
  X,
  Copy,
  Check,
  FileText,
  Hash,
  Braces,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const TRUNCATE_LENGTH = 200;

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        'rounded p-1 transition-colors',
        copied
          ? 'text-green-500'
          : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted',
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
};

const DocumentViewer = ({
  document,
  onClose,
}: {
  document: Document;
  onClose: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = document.document.length > TRUNCATE_LENGTH;
  const displayText =
    expanded || !isLong
      ? document.document
      : document.document.slice(0, TRUNCATE_LENGTH);

  return (
    <>
      {/* Backdrop */}
      <div
        className="bg-foreground/20 fixed inset-0 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="bg-background border-border fixed top-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-md">
              <FileText className="text-primary h-3.5 w-3.5" />
            </div>
            <span className="text-foreground text-sm font-medium">
              Document
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-5">
            {/* ID */}
            <div>
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Hash className="h-3 w-3" />
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  ID
                </span>
              </div>
              <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2">
                <code className="text-foreground flex-1 truncate font-mono text-xs">
                  {document.id}
                </code>
                <CopyButton text={document.id} />
              </div>
            </div>

            {/* Document */}
            <div>
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  Content
                </span>
              </div>
              <div className="bg-muted/50 rounded-md px-3 py-2.5">
                <p className="text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {displayText}
                </p>
                {isLong && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium transition-colors"
                  >
                    {expanded ? (
                      <>
                        Show less <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Embedding */}
            <div>
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Braces className="h-3 w-3" />
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  Embedding
                </span>
                <span className="text-muted-foreground/50 text-[11px]">
                  {document.embedding.length}d
                </span>
              </div>
              <div className="bg-muted/50 max-h-24 overflow-y-auto rounded-md px-3 py-2.5">
                <code className="text-foreground/70 block font-mono text-[11px] leading-relaxed whitespace-pre">
                  [
                  {document.embedding
                    .slice(0, 20)
                    .map((v) => v.toFixed(4))
                    .join(', ')}
                  {document.embedding.length > 20 && ', ...'}]
                </code>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Braces className="h-3 w-3" />
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  Metadata
                </span>
              </div>
              <div className="bg-muted/50 max-h-60 overflow-y-auto rounded-md px-3 py-2.5">
                <pre className="text-foreground font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                  {JSON.stringify(document.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocumentViewer;
