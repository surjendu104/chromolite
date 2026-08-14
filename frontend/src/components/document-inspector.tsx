import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatMetadataValue, getDocumentTitle } from '../lib/document-utils';
import type { Document } from '../store/collection.store';
import { SectionLabel } from './ui/section-label';
import { CopyButton } from './ui/copy-button';

type MetadataViewProps = {
  metadata: Record<string, unknown>;
};

export const MetadataView = ({ metadata }: MetadataViewProps) => {
  const entries = Object.entries(metadata).filter(
    ([key]) => !key.startsWith('#'),
  );

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-[12px]">No metadata</p>
    );
  }

  return (
    <dl className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[1fr_1.2fr] gap-3 text-[12px]">
          <dt className="text-muted-foreground truncate">{key}</dt>
          <dd
            className={cn(
              'font-medium break-words',
              typeof value === 'boolean' || typeof value === 'number'
                ? 'font-mono'
                : '',
            )}
          >
            {formatMetadataValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

type DocumentInspectorProps = {
  document: Document;
  index: number;
  onClose: () => void;
  variant?: 'panel' | 'overlay';
};

const DocumentInspector = ({
  document,
  index,
  onClose,
  variant = 'panel',
}: DocumentInspectorProps) => {
  const [showVector, setShowVector] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const title = getDocumentTitle(document, index);
  const jsonPayload = JSON.stringify(
    {
      id: document.id,
      document: document.document,
      metadata: document.metadata,
    },
    null,
    2,
  );

  const content = (
    <>
      <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          Document
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          <div>
            <h2 className="text-foreground text-[14px] font-medium leading-snug">
              {title}
            </h2>
          </div>

          <div>
            <SectionLabel className="mb-2">ID</SectionLabel>
            <div className="flex items-center gap-1">
              <code className="text-muted-foreground font-mono text-[11px] break-all">
                {document.id}
              </code>
              <CopyButton text={document.id} label="Copy ID" />
            </div>
          </div>

          <div>
            <SectionLabel className="mb-2">Content</SectionLabel>
            <div className="text-foreground text-[13px] leading-relaxed break-words whitespace-pre-wrap">
              {document.document || (
                <span className="text-muted-foreground italic">Empty</span>
              )}
            </div>
          </div>

          <div>
            <SectionLabel className="mb-2">Metadata</SectionLabel>
            <MetadataView metadata={document.metadata} />
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-muted-foreground hover:text-accent-interactive mt-2 inline-flex items-center gap-0.5 text-[11px] transition-colors"
            >
              {showRawJson ? (
                <>
                  Hide JSON <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  View JSON <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
            {showRawJson && (
              <div className="border-border bg-muted/30 mt-2 rounded-md border p-3">
                <div className="mb-1 flex justify-end">
                  <CopyButton text={jsonPayload} label="Copy JSON" />
                </div>
                <pre className="text-foreground font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                  {JSON.stringify(document.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {document.embedding.length > 0 && (
            <div>
              <SectionLabel className="mb-2">Embedding</SectionLabel>
              <p className="text-foreground font-mono text-[12px]">
                {document.embedding.length} dimensions
              </p>
              <button
                type="button"
                onClick={() => setShowVector(!showVector)}
                className="text-muted-foreground hover:text-accent-interactive mt-1.5 inline-flex items-center gap-0.5 text-[11px] transition-colors"
              >
                {showVector ? (
                  <>
                    Hide vector <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    View vector <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
              {showVector && (
                <div className="border-border bg-muted/30 mt-2 max-h-32 overflow-y-auto rounded-md border p-3">
                  <code className="text-muted-foreground font-mono text-[10px] leading-relaxed break-all">
                    [
                    {document.embedding
                      .slice(0, 20)
                      .map((v) => v.toFixed(4))
                      .join(', ')}
                    {document.embedding.length > 20 && ', …'}]
                  </code>
                </div>
              )}
            </div>
          )}

          <div className="border-border flex gap-2 border-t pt-4">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(document.id)}
              className="border-border hover:bg-muted rounded-md border px-2.5 py-1 text-[12px] transition-colors"
            >
              Copy ID
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(jsonPayload)}
              className="border-border hover:bg-muted rounded-md border px-2.5 py-1 text-[12px] transition-colors"
            >
              Copy JSON
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (variant === 'overlay') {
    return (
      <>
        <div
          className="bg-foreground/10 fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
        <aside
          className="bg-inspector border-border fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(100vw,480px)] flex-col border-l shadow-lg lg:hidden"
          role="dialog"
          aria-label="Document inspector"
        >
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside
      className="bg-inspector border-border hidden w-[min(480px,40vw)] shrink-0 flex-col border-l lg:flex"
      role="complementary"
      aria-label="Document inspector"
    >
      {content}
    </aside>
  );
};

export default DocumentInspector;
