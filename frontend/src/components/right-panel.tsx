import { LayoutGrid, PanelLeft, FileText, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSidebarStore } from '../store/sidebar.store';
import { useCollectionStore } from '../store/collection.store';
import { useThemeStore } from '../store/theme.store';
import DashboardPanel from './panels/dashboard';
import DocumentPanel from './panels/documents';

const TABS = [
  { id: 'documents', name: 'Explorer', icon: FileText },
  { id: 'overview', name: 'Overview', icon: LayoutGrid },
] as const;

const RightPanel = () => {
  const { activeTab, setActiveTab, toggleCollapsed } = useSidebarStore();
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <main className="bg-background relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-border flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Toggle sidebar"
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {activeCollection && (
          <>
            <div className="bg-border h-3.5 w-px" />
            <div className="flex items-center gap-0.5">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors',
                      isActive
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
          }
          className="text-muted-foreground hover:text-foreground hover:bg-muted ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeCollection && activeTab === 'overview' && <DashboardPanel />}
        {activeCollection && activeTab === 'documents' && <DocumentPanel />}
        {!activeCollection && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-[13px]">
              Select a collection from the sidebar
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default RightPanel;
