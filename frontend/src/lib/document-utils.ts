import type { Document } from '../store/collection.store';

const PREVIEW_KEYS = [
  'language',
  'category',
  'topic',
  'word_count',
  'premium',
  'featured',
  'type',
  'source',
];

export function truncateId(id: string, maxLength = 24): string {
  if (id.length <= maxLength) return id;
  return `${id.slice(0, maxLength)}…`;
}

export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function getMetadataPreview(
  metadata: Record<string, unknown>,
  maxFields = 3,
): string[] {
  const entries: [string, unknown][] = [];

  for (const key of PREVIEW_KEYS) {
    if (key in metadata && metadata[key] !== null && metadata[key] !== '') {
      entries.push([key, metadata[key]]);
    }
  }

  if (entries.length < maxFields) {
    for (const [key, value] of Object.entries(metadata)) {
      if (entries.length >= maxFields) break;
      if (PREVIEW_KEYS.includes(key)) continue;
      if (key.startsWith('#')) continue;
      if (value === null || value === '') continue;
      entries.push([key, value]);
    }
  }

  return entries
    .slice(0, maxFields)
    .map(([, value]) => formatMetadataValue(value));
}

export function getDocumentTitle(doc: Document, index: number): string {
  const content = doc.document.trim();
  const firstLine = content.split('\n')[0]?.trim() ?? '';
  if (firstLine.length > 0 && firstLine.length <= 80) return firstLine;
  return `Document #${index}`;
}

export function getDocumentPreview(doc: Document, maxLength = 140): string {
  const content = doc.document.trim();
  const lines = content.split('\n').filter(Boolean);
  const body = lines.length > 1 ? lines.slice(1).join(' ').trim() : content;
  if (body.length <= maxLength) return body;
  return `${body.slice(0, maxLength)}…`;
}

export type SortOption = 'default' | 'id-asc' | 'id-desc' | 'content-asc';

export function sortDocuments(
  documents: Document[],
  sort: SortOption,
): Document[] {
  if (sort === 'default') return documents;
  const sorted = [...documents];
  switch (sort) {
    case 'id-asc':
      return sorted.sort((a, b) => a.id.localeCompare(b.id));
    case 'id-desc':
      return sorted.sort((a, b) => b.id.localeCompare(a.id));
    case 'content-asc':
      return sorted.sort((a, b) => a.document.localeCompare(b.document));
    default:
      return sorted;
  }
}

export function filterDocuments(
  documents: Document[],
  searchQuery: string,
  activeFilters: Record<string, string>,
): Document[] {
  let result = documents;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (doc) =>
        doc.id.toLowerCase().includes(q) ||
        doc.document.toLowerCase().includes(q) ||
        JSON.stringify(doc.metadata).toLowerCase().includes(q),
    );
  }

  for (const [key, value] of Object.entries(activeFilters)) {
    result = result.filter(
      (doc) => formatMetadataValue(doc.metadata[key]) === value,
    );
  }

  return result;
}

export function getAvailableFilterKeys(
  documents: Document[],
): Record<string, string[]> {
  const keys: Record<string, Set<string>> = {};

  for (const doc of documents) {
    for (const [key, value] of Object.entries(doc.metadata)) {
      if (key.startsWith('#')) continue;
      if (value === null || value === '') continue;
      if (!keys[key]) keys[key] = new Set();
      keys[key].add(formatMetadataValue(value));
    }
  }

  return Object.fromEntries(
    Object.entries(keys).map(([k, v]) => [k, Array.from(v).sort()]),
  );
}
