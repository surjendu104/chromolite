import { create } from 'zustand';

type Collection = {
  id: string;
  name: string;
  database: string;
  tenant: string;
};

type CollectionDetails = Collection & {
  schema: Record<string, unknown>;
  configuration: Record<string, unknown>;
  configuration_json: Record<string, unknown>;
  document_count: number;
  fork_count: Record<string, unknown>;
};

type DocumentMetadata = Record<string, unknown>;

export type Document = {
  id: string;
  embedding: number[];
  document: string;
  metadata: DocumentMetadata;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

type CollectionStore = {
  collections: Collection[];
  setCollections: (value: Collection[]) => void;
  activeCollection: Collection | null;
  setActiveCollection: (value: Collection) => void;
  activeCollectionDetails: CollectionDetails | null;
  setActiveCollectionDetails: (value: CollectionDetails) => void;
  documents: Document[];
  setDocuments: (value: Document[]) => void;
  pagination: Pagination;
  setPagination: (value: Pagination) => void;
};

export const useCollectionStore = create<CollectionStore>((set) => ({
  collections: [],
  setCollections: (value) => set({ collections: value }),
  activeCollection: null,
  setActiveCollection: (value) => set({ activeCollection: value }),
  activeCollectionDetails: null,
  setActiveCollectionDetails: (value) =>
    set({ activeCollectionDetails: value }),
  documents: [],
  setDocuments: (value) => set({ documents: value }),
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  },
  setPagination: (value) => set({ pagination: value }),
}));
