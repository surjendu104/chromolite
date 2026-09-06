import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import {
  Search,
  RefreshCw,
  X,
  Sun,
  Moon,
  LayoutGrid,
  FileText,
  Compass,
  Activity,
  Radio,
  Layers,
  GitFork,
  Copy,
  Sliders,
} from 'lucide-react';
import RightPanel from './components/right-panel';
import Sidebar from './components/sidebar';
import CommandPalette from './components/command-palette';
import type { Command } from './hooks/use-command-palette';
import { useSidebarStore, type TabId } from './store/sidebar.store';
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  const commands: Command[] = [
    {
      id: 'search-docs',
      label: 'Search documents in active collection',
      icon: Search,
      shortcut: '/',
      keywords: ['find', 'filter', 'query', 'documents'],
      action: () => {
        navigateTo('documents');
        setTimeout(() => {
          document
            .querySelector<HTMLInputElement>(
              'input[aria-label="Search documents"], input[type="search"]',
            )
            ?.focus();
        }, 50);
      },
    },
    {
      id: 'view-overview',
      label: 'Go to Collection Overview & Health',
      icon: LayoutGrid,
      keywords: ['dashboard', 'schema', 'config', 'health', 'metrics'],
      action: () => navigateTo('overview'),
    },
    {
      id: 'view-documents',
      label: 'Go to Document Explorer',
      icon: FileText,
      keywords: ['explorer', 'browse', 'rows'],
      action: () => navigateTo('documents'),
    },
    {
      id: 'view-embeddings',
      label: 'Go to 2D Embedding Projection (PCA/UMAP)',
      icon: Compass,
      keywords: ['projection', 'umap', 'pca', 'manifold', 'vectors'],
      action: () => navigateTo('embeddings'),
    },
    {
      id: 'view-similarity',
      label: 'Go to Similarity Distribution',
      icon: Activity,
      keywords: ['cosine', 'pairwise', 'distribution'],
      action: () => navigateTo('similarity'),
    },
    {
      id: 'view-neighbors',
      label: 'Go to kNN & Local Density Analysis',
      icon: Radio,
      keywords: ['knn', 'neighbors', 'density'],
      action: () => navigateTo('neighbors'),
    },
    {
      id: 'view-clusters',
      label: 'Go to Clustering & Quality Analysis',
      icon: Layers,
      keywords: ['kmeans', 'hdbscan', 'silhouette'],
      action: () => navigateTo('clusters'),
    },
    {
      id: 'view-outliers',
      label: 'Go to Outlier & Isolation Detection',
      icon: GitFork,
      keywords: ['lof', 'isolation', 'anomalies'],
      action: () => navigateTo('outliers'),
    },
    {
      id: 'view-duplicates',
      label: 'Go to Duplicate Detection',
      icon: Copy,
      keywords: ['exact', 'near-duplicate', 'redundancy'],
      action: () => navigateTo('duplicates'),
    },
    {
      id: 'view-queries',
      label: 'Go to Vector Query Workspace',
      icon: Search,
      keywords: ['search', 'retrieval', 'query'],
      action: () => navigateTo('queries'),
    },
    {
      id: 'view-evaluation',
      label: 'Go to Retrieval Evaluation & Recall Benchmarks',
      icon: Sliders,
      keywords: ['ann', 'recall', 'latency', 'precision'],
      action: () => navigateTo('evaluation'),
    },
    {
      id: 'refresh-docs',
      label: 'Refresh documents',
      icon: RefreshCw,
      keywords: ['reload', 'fetch'],
      action: () => {
        navigateTo('documents');
        document
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Refresh documents"]',
          )
          ?.click();
      },
    },
    {
      id: 'close-inspector',
      label: 'Close document inspector',
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
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: theme === 'dark' ? Sun : Moon,
      keywords: ['theme', 'dark', 'light', 'color'],
      action: toggleTheme,
    },
  ];

  if (activeCollection) {
    commands.unshift({
      id: 'active-collection-info',
      label: `Inspect ${activeCollection.name} collection`,
      icon: FileText,
      keywords: ['active', 'current'],
      action: () => navigateTo('overview'),
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-background text-foreground flex h-screen w-screen overflow-hidden font-sans">
        <Sidebar onOpenCommandPalette={openCommandPalette} />
        <RightPanel onOpenCommandPalette={openCommandPalette} />
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
