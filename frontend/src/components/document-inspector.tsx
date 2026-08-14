import { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { highlightJson } from '../lib/syntax-highlight';
import { formatMetadataValue, getDocumentTitle } from '../lib/document-utils';
import type { Document } from '../store/collection.store';
import { useThemeStore } from '../store/theme.store';
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
    return <p className="text-muted-foreground text-[12px]">No metadata</p>;
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

type MetadataViewMode = 'parsed' | 'json';

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
  const [metadataView, setMetadataView] = useState<MetadataViewMode>('parsed');
  const [contentExpanded, setContentExpanded] = useState(false);
  const [jsonHtml, setJsonHtml] = useState('');

  const theme = useThemeStore((s) => s.theme);

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
  const metadataJson = JSON.stringify(document.metadata, null, 2);
  const vectorJson = JSON.stringify(document.embedding);

  const contentText = document.document;
  const contentWords = contentText.trim()
    ? contentText.trim().split(/\s+/).length
    : 0;
  const isContentLong = contentText.length > 500;

  const vectorPreview = document.embedding.slice(0, 64);
  const vectorMax = Math.max(...vectorPreview.map(Math.abs), 1e-6);

  useEffect(() => {
    if (metadataView !== 'json') return;
    let cancelled = false;
    highlightJson(metadataJson, theme).then((html) => {
      if (!cancelled) setJsonHtml(html);
    });
    return () => {
      cancelled = true;
    };
  }, [metadataView, metadataJson, theme]);

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

      <div className="scrollbar-thin scrollbar-thumb-foreground/30 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-foreground text-[14px] leading-snug font-medium">
              {title}
            </h2>
            {/*<div className="flex shrink-0 items-center gap-1">
              <CopyButton text={document.id} label="Copy ID" />
              <CopyButton text={jsonPayload} label="Copy JSON" />
            </div>*/}
          </div>

          <div>
            <SectionLabel className="mb-2">ID</SectionLabel>
            <div className="flex items-center gap-1">
              <code className="text-muted-foreground font-mono text-[11px] break-all">
                {document.id}
              </code>
            </div>
          </div>

          <div>
            <SectionLabel className="mb-2">Content</SectionLabel>
            <div className="border-border bg-muted/30 overflow-hidden rounded-md border">
              <div className="border-border/60 flex items-center justify-between gap-2 border-b px-3 py-1.5">
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {contentWords} words
                </span>
                <CopyButton text={contentText} label="Copy content" />
              </div>
              <div className="p-3">
                <div
                  className={cn(
                    'relative',
                    isContentLong &&
                      !contentExpanded &&
                      'max-h-40 overflow-hidden',
                  )}
                >
                  <div className="text-foreground text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                    {contentText || (
                      <span className="text-muted-foreground italic">Empty</span>
                    )}
                  </div>
                  {isContentLong && !contentExpanded && (
                    <div className="from-inspector pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t" />
                  )}
                </div>
                {isContentLong && (
                  <button
                    type="button"
                    onClick={() => setContentExpanded(!contentExpanded)}
                    className="text-accent-interactive mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium transition-colors hover:opacity-80"
                  >
                    {contentExpanded ? (
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
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <SectionLabel>Metadata</SectionLabel>
              <div className="bg-muted inline-flex items-center rounded-md p-0.5">
                {(['parsed', 'json'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setMetadataView(view)}
                    aria-pressed={metadataView === view}
                    className={cn(
                      'relative rounded px-2 py-0.5 text-[11px] transition-colors',
                      metadataView === view
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {metadataView === view && (
                      <motion.div
                        layoutId={`${variant}-metadata-pill`}
                        className="bg-background absolute inset-0 rounded shadow-sm"
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                    <span className="relative z-10">
                      {view === 'parsed' ? 'Parsed' : 'JSON'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {metadataView === 'parsed' ? (
              <MetadataView metadata={document.metadata} />
            ) : (
              <div className="border-border bg-muted/30 overflow-hidden rounded-md border">
                <div className="border-border/60 flex items-center justify-between border-b px-3 py-1.5">
                  <span className="text-muted-foreground text-[11px]">
                    Raw metadata
                  </span>
                  <CopyButton text={metadataJson} label="Copy metadata JSON" />
                </div>
                <div className="scrollbar-thin scrollbar-thumb-foreground/30 max-h-72 overflow-y-auto p-3 [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0 [&_.shiki>code]:!font-mono">
                  {jsonHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: jsonHtml }} />
                  ) : (
                    <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                  )}
                </div>
              </div>
            )}
          </div>

          {document.embedding.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <SectionLabel>Embedding</SectionLabel>
                <CopyButton text={vectorJson} label="Copy vector" />
              </div>
              <div className="border-border bg-muted/30 overflow-hidden rounded-md border">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-mono text-[12px] tabular-nums">
                      {document.embedding.length} dimensions
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      · {vectorPreview.length} shown
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVector(!showVector)}
                    className="text-muted-foreground hover:text-accent-interactive inline-flex items-center gap-0.5 text-[11px] transition-colors"
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
                </div>

                <div
                  className="flex h-9 items-end gap-px border-t border-border/60 px-3 py-1.5"
                  aria-hidden
                >
                  {vectorPreview.map((value, i) => {
                    const ratio = Math.abs(value) / vectorMax;
                    const isPeak = Math.abs(value) === vectorMax;
                    return (
                      <span
                        key={i}
                        className={cn(
                          'flex-1 rounded-[1px]',
                          isPeak
                            ? 'bg-accent-interactive/70'
                            : 'bg-foreground/25',
                        )}
                        style={{ height: `${Math.max(8, ratio * 100)}%` }}
                      />
                    );
                  })}
                </div>

                {showVector && (
                  <div className="border-border/60 scrollbar-thin scrollbar-thumb-foreground/30 max-h-32 overflow-y-auto border-t px-3 py-2">
                    <code className="text-muted-foreground font-mono text-[10px] leading-relaxed break-all">
                      [{document.embedding.map((v) => v.toFixed(4)).join(', ')}]
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (variant === 'overlay') {
    return (
      <motion.div
        className="fixed inset-0 z-50 lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div
          className="bg-foreground/10 absolute inset-0"
          onClick={onClose}
          aria-hidden
        />
        <motion.aside
          className="bg-inspector border-border absolute inset-y-0 right-0 flex w-full max-w-[min(100vw,480px)] flex-col border-l shadow-lg"
          role="dialog"
          aria-label="Document inspector"
          initial={{ x: 32 }}
          animate={{ x: 0 }}
          exit={{ x: 32 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {content}
        </motion.aside>
      </motion.div>
    );
  }

  return (
    <motion.aside
      className="bg-inspector border-border hidden w-[min(480px,40vw)] shrink-0 flex-col border-l lg:flex"
      role="complementary"
      aria-label="Document inspector"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      {content}
    </motion.aside>
  );
};

export default DocumentInspector;
