import {
  LayoutGrid,
  PanelLeft,
  FileText,
  Compass,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSidebarStore, type TabId } from '../store/sidebar.store';
import { useCollectionStore } from '../store/collection.store';
import { useThemeStore } from '../store/theme.store';
import ClustersPanel from './panels/clusters-panel';
import DashboardPanel from './panels/dashboard';
import DocumentPanel from './panels/documents';
import DuplicatesPanel from './panels/duplicates-panel';
import EmbeddingsPanel from './panels/embeddings-panel';
import NeighborsPanel from './panels/neighbors-panel';
import OutliersPanel from './panels/outliers-panel';
import SimilarityPanel from './panels/similarity-panel';
import { AnalyticsView } from './panels/analytics-view';
import { EmptyState } from './ui/empty-state';

const PRIMARY_TABS: {
  id: TabId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'documents', name: 'Explorer', icon: FileText },
  { id: 'overview', name: 'Overview', icon: LayoutGrid },
  { id: 'embeddings', name: 'Embeddings', icon: Compass },
];

interface RightPanelProps {
  onOpenCommandPalette?: () => void;
}

export const RightPanel = ({ onOpenCommandPalette }: RightPanelProps) => {
  const { activeTab, setActiveTab, toggleCollapsed } = useSidebarStore();
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <main className="bg-background relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* Top Application Bar */}
      <div className="border-border bg-surface z-10 flex h-11 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            className="text-text-secondary hover:text-foreground hover:bg-surface-subtle flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          {activeCollection && (
            <>
              <div className="bg-border mx-0.5 h-3.5 w-px" />
              <div className="flex items-center gap-1">
                {PRIMARY_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 font-sans text-[12px] transition-colors select-none',
                        isActive
                          ? 'bg-surface-subtle text-foreground border-border shadow-subtle border font-medium'
                          : 'text-text-secondary hover:text-foreground hover:bg-surface-subtle/60 border border-transparent',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-3.5 w-3.5',
                          isActive ? 'text-accent' : 'text-text-muted',
                        )}
                      />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/*{onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="text-text-secondary hover:text-foreground hover:bg-surface-subtle hover:border-border flex h-7 cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 text-[12px] transition-colors"
            >
              <Search className="text-text-muted h-3.5 w-3.5" />
              <span className="text-text-muted hidden font-sans sm:inline">
                Search...
              </span>
              <kbd className="text-text-muted bg-surface-subtle border-border hidden rounded border px-1 py-0.5 font-mono text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>
          )}*/}

          <div className="bg-border mx-0.5 h-3.5 w-px" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
            className="text-text-secondary hover:text-foreground hover:bg-surface-subtle flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeCollection ? (
          <>
            {activeTab === 'overview' && <DashboardPanel />}
            {activeTab === 'documents' && <DocumentPanel />}
            {activeTab === 'embeddings' && <EmbeddingsPanel />}
            {activeTab === 'similarity' && <SimilarityPanel />}
            {activeTab === 'neighbors' && <NeighborsPanel />}
            {activeTab === 'clusters' && <ClustersPanel />}
            {activeTab === 'outliers' && <OutliersPanel />}
            {activeTab === 'duplicates' && <DuplicatesPanel />}
            {activeTab !== 'overview' &&
              activeTab !== 'documents' &&
              activeTab !== 'embeddings' &&
              activeTab !== 'similarity' &&
              activeTab !== 'neighbors' &&
              activeTab !== 'clusters' &&
              activeTab !== 'outliers' &&
              activeTab !== 'duplicates' && <AnalyticsView tab={activeTab} />}
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              title="No collection selected"
              description="Select a ChromaDB collection from the sidebar to inspect vectors, schemas, and documents."
            />
          </div>
        )}
      </div>
    </main>
  );
};

export default RightPanel;
