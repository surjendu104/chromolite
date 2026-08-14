import { create } from 'zustand';

type SidebarStore = {
  activeTab: string;
  collapsed: boolean;
  setActiveTab: (tab: string) => void;
  toggleCollapsed: () => void;
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  activeTab: 'documents',
  collapsed: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
}));
