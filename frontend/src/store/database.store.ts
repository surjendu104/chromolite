import { create } from 'zustand';

type DatabaseStore = {
  name: string | null;
  setName: (value: string) => void;
};

export const useDatabaseStore = create<DatabaseStore>((set) => ({
  name: 'Test Database',
  setName: (value: string) => set({ name: value }),
}));
