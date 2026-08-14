import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { Search, RefreshCw, X, Sun, Moon } from 'lucide-react';
import RightPanel from './components/right-panel';
import Sidebar from './components/sidebar';
import CommandPalette from './components/command-palette';
import type { Command } from './hooks/use-command-palette';
import { useSidebarStore } from './store/sidebar.store';
import { useCollectionStore } from './store/collection.store';
import { useThemeStore } from './store/theme.store';

function App() {
  const [commandOpen, setCommandOpen] = useState(false);
  const { setActiveTab } = useSidebarStore();
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('chromolite-theme', theme);
  }, [theme]);

  const openCommandPalette = useCallback(() => setCommandOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands: Command[] = [
    {
      id: 'search',
      label: 'Search documents',
      icon: Search,
      shortcut: '/',
      keywords: ['find', 'query'],
      action: () => {
        setActiveTab('documents');
        setTimeout(() => {
          document
            .querySelector<HTMLInputElement>(
              'input[aria-label="Search documents"]',
            )
            ?.focus();
        }, 50);
      },
    },
    {
      id: 'refresh',
      label: 'Refresh collection',
      icon: RefreshCw,
      keywords: ['reload'],
      action: () => {
        setActiveTab('documents');
        document
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Refresh documents"]',
          )
          ?.click();
      },
    },
    {
      id: 'overview',
      label: 'View overview',
      icon: Search,
      keywords: ['dashboard', 'schema', 'config'],
      action: () => setActiveTab('overview'),
    },
    {
      id: 'close-inspector',
      label: 'Close inspector',
      icon: X,
      shortcut: 'Esc',
      action: () => {
        document
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Close inspector"]',
          )
          ?.click();
      },
    },
    // {
    //   id: 'copy-id',
    //   label: 'Copy document ID',
    //   icon: Copy,
    //   action: () => {
    //     document
    //       .querySelector<HTMLButtonElement>('button[aria-label="Copy ID"]')
    //       ?.click();
    //   },
    // },
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      icon: theme === 'dark' ? Sun : Moon,
      keywords: ['theme', 'dark', 'light'],
      action: toggleTheme,
    },
  ];

  if (activeCollection) {
    commands.splice(3, 0, {
      id: 'explorer',
      label: `Open ${activeCollection.name}`,
      keywords: ['collection', 'documents'],
      action: () => setActiveTab('documents'),
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-sidebar text-foreground flex h-screen w-screen overflow-hidden">
        <Sidebar onOpenCommandPalette={openCommandPalette} />
        <RightPanel />
        <AnimatePresence>
          {commandOpen && (
            <CommandPalette onClose={closeCommandPalette} commands={commands} />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

export default App;
