import { create } from 'zustand';

export type TabId =
  | 'overview'
  | 'documents'
  | 'embeddings'
  | 'similarity'
  | 'neighbors'
  | 'clusters'
  | 'outliers'
  | 'duplicates'
  | 'queries'
  | 'evaluation';

type SidebarStore = {
  activeTab: TabId;
  collapsed: boolean;
  setActiveTab: (tab: TabId) => void;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  activeTab: 'documents',
  collapsed: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setCollapsed: (collapsed) => set({ collapsed }),
}));
