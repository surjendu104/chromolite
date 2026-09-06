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
import { Badge } from './ui/badge';
import { Panel } from './ui/panel';

type MetadataViewProps = {
  metadata: Record<string, unknown>;
};

export const MetadataView = ({ metadata }: MetadataViewProps) => {
  const entries = Object.entries(metadata).filter(
    ([key]) => !key.startsWith('#'),
  );

  if (entries.length === 0) {
    return (
      <p className="text-text-muted py-1 font-sans text-[12px]">
        No user metadata attached
      </p>
    );
  }

  return (
    <div className="border-border bg-surface-subtle/50 overflow-hidden rounded-md border">
      <table className="w-full text-left text-[12px]">
        <tbody className="divide-border/60 divide-y">
          {entries.map(([key, value]) => {
            const isTechnical =
              typeof value === 'boolean' ||
              typeof value === 'number' ||
              key.includes('id') ||
              key.includes('time') ||
              key.includes('date');

            return (
              <tr
                key={key}
                className="hover:bg-surface-subtle transition-colors"
              >
                <td className="text-text-muted w-1/3 truncate px-3 py-1.5 font-mono text-[11px] select-all">
                  {key}
                </td>
                <td
                  className={cn(
                    'text-foreground px-3 py-1.5 break-words select-all',
                    isTechnical ? 'font-mono text-[11.5px]' : 'font-sans',
                  )}
                >
                  {formatMetadataValue(value)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

type MetadataViewMode = 'parsed' | 'json';

type DocumentInspectorProps = {
  document: Document;
  index: number;
  onClose: () => void;
  variant?: 'panel' | 'overlay';
};

export const DocumentInspector = ({
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

  const fullJson = JSON.stringify(
    {
      id: document.id,
      document: document.document,
      metadata: document.metadata,
      embedding: document.embedding,
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
  const isContentLong = contentText.length > 350;

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

  const inspectorContent = (
    <div className="bg-surface flex h-full flex-col select-text">
      {/* Header */}
      <div className="border-border bg-surface flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <SectionLabel mono>Document Inspector</SectionLabel>
          <Badge variant="neutral" size="xs" mono>
            #{index}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton text={fullJson} label="Copy Complete JSON" size="sm" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="text-text-muted hover:text-foreground hover:bg-surface-subtle cursor-pointer rounded-md p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Document Title & ID */}
        <div>
          <h2 className="text-foreground font-sans text-[15px] leading-snug font-semibold">
            {title}
          </h2>
          <div className="border-border bg-surface-subtle mt-2 flex items-center justify-between gap-2 rounded-md border p-2">
            <div className="min-w-0 flex-1">
              <div className="text-text-muted mb-0.5 font-mono text-[10px] tracking-wider uppercase">
                Vector ID
              </div>
              <code className="text-foreground font-mono text-[11px] break-all select-all">
                {document.id}
              </code>
            </div>
            <CopyButton text={document.id} label="Copy ID" size="sm" />
          </div>
        </div>

        {/* Content Section */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <SectionLabel mono>Document Content</SectionLabel>
            <span className="text-text-muted font-mono text-[11px]">
              {contentWords} words ({contentText.length} chars)
            </span>
          </div>

          <Panel className="bg-surface-subtle/40">
            <div className="border-border/60 bg-surface-subtle/80 flex items-center justify-between border-b px-3 py-1.5">
              <span className="text-text-muted font-mono text-[10px] tracking-wider uppercase">
                Raw Text
              </span>
              <CopyButton text={contentText} label="Copy text" size="sm" />
            </div>
            <div className="p-3">
              <div
                className={cn(
                  'text-foreground relative font-sans text-[12.5px] leading-relaxed break-words whitespace-pre-wrap',
                  isContentLong &&
                    !contentExpanded &&
                    'max-h-48 overflow-hidden',
                )}
              >
                {contentText || (
                  <span className="text-text-muted italic">Empty document</span>
                )}
                {isContentLong && !contentExpanded && (
                  <div className="from-surface pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent" />
                )}
              </div>
              {isContentLong && (
                <button
                  type="button"
                  onClick={() => setContentExpanded(!contentExpanded)}
                  className="text-accent hover:text-accent-hover mt-2 inline-flex cursor-pointer items-center gap-1 font-sans text-[11.5px] font-medium transition-colors"
                >
                  {contentExpanded ? (
                    <>
                      Show less <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Show full content <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </Panel>
        </div>

        {/* Metadata Section */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <SectionLabel mono>Metadata</SectionLabel>
            <div className="border-border bg-surface-subtle inline-flex items-center rounded-md border p-0.5">
              {(['parsed', 'json'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setMetadataView(view)}
                  className={cn(
                    'cursor-pointer rounded px-2 py-0.5 font-sans text-[11px] transition-colors',
                    metadataView === view
                      ? 'bg-surface text-foreground shadow-subtle font-medium'
                      : 'text-text-muted hover:text-foreground',
                  )}
                >
                  {view === 'parsed' ? 'Table' : 'JSON'}
                </button>
              ))}
            </div>
          </div>

          {metadataView === 'parsed' ? (
            <MetadataView metadata={document.metadata} />
          ) : (
            <Panel className="bg-surface-subtle/40">
              <div className="border-border/60 bg-surface-subtle/80 flex items-center justify-between border-b px-3 py-1.5">
                <span className="text-text-muted font-mono text-[10px] tracking-wider uppercase">
                  JSON payload
                </span>
                <CopyButton text={metadataJson} label="Copy JSON" size="sm" />
              </div>
              <div className="max-h-60 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0">
                {jsonHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: jsonHtml }} />
                ) : (
                  <div className="bg-surface-subtle h-4 w-24 animate-pulse rounded" />
                )}
              </div>
            </Panel>
          )}
        </div>

        {/* Embedding Section */}
        {document.embedding && document.embedding.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <SectionLabel mono>Embedding Vector</SectionLabel>
              <CopyButton
                text={vectorJson}
                label="Copy float array"
                size="sm"
              />
            </div>

            <Panel className="bg-surface-subtle/40">
              <div className="border-border/60 bg-surface-subtle/80 flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-mono text-[12px] font-semibold tabular-nums">
                    {document.embedding.length} dimensions
                  </span>
                  <span className="text-text-muted font-mono text-[10.5px]">
                    ({vectorPreview.length} shown)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVector(!showVector)}
                  className="text-text-secondary hover:text-foreground inline-flex cursor-pointer items-center gap-0.5 font-sans text-[11.5px] font-medium transition-colors"
                >
                  {showVector ? (
                    <>
                      Hide floats <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      View array <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>

              {/* Sparkline Visualizer */}
              <div
                className="bg-surface flex h-10 items-end gap-px px-3 py-2"
                aria-hidden
              >
                {vectorPreview.map((value, i) => {
                  const ratio = Math.abs(value) / vectorMax;
                  const isPeak = Math.abs(value) === vectorMax;
                  return (
                    <span
                      key={i}
                      title={`dim[${i}]: ${value.toFixed(4)}`}
                      className={cn(
                        'flex-1 rounded-[1px] transition-all',
                        isPeak
                          ? 'bg-accent'
                          : 'bg-foreground/20 hover:bg-foreground/40',
                      )}
                      style={{ height: `${Math.max(10, ratio * 100)}%` }}
                    />
                  );
                })}
              </div>

              {showVector && (
                <div className="border-border/60 bg-surface text-text-secondary max-h-36 overflow-y-auto border-t p-3 font-mono text-[10.5px] leading-relaxed break-all select-all">
                  [{document.embedding.map((v) => v.toFixed(4)).join(', ')}]
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );

  if (variant === 'overlay') {
    return (
      <motion.div
        className="fixed inset-0 z-50 lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
      >
        <div
          className="bg-background/50 fixed inset-0 backdrop-blur-xs"
          onClick={onClose}
          aria-hidden
        />
        <motion.aside
          className="border-border bg-surface shadow-popover absolute inset-y-0 right-0 flex w-full max-w-[min(100vw,440px)] flex-col border-l"
          role="dialog"
          aria-label="Document inspector"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {inspectorContent}
        </motion.aside>
      </motion.div>
    );
  }

  return (
    <motion.aside
      className="border-border bg-surface hidden w-[min(440px,38vw)] shrink-0 flex-col border-l lg:flex"
      role="complementary"
      aria-label="Document inspector"
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 'min(440px, 38vw)' }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
    >
      {inspectorContent}
    </motion.aside>
  );
};

export default DocumentInspector;
