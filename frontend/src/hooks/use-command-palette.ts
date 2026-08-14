import type { LucideIcon } from 'lucide-react';

export type Command = {
  id: string;
  label: string;
  action: () => void;
  icon?: LucideIcon;
  shortcut?: string;
  keywords?: string[];
};
