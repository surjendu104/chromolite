import { Boxes, LayoutDashboard, PanelLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSidebarStore } from '../store/sidebar.store';
import DashboardPanel from './panels/dashboard';
import DocumentPanel from './panels/documents';

const TABS = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: Boxes,
  },
];

const RightPanel = () => {
  const { activeTab, setActiveTab, toggleCollapsed } = useSidebarStore();

  return (
    <main className="bg-background border-sidebar-border mt-2.5 flex-1 overflow-y-auto rounded-tl-xl border-t-2 border-l-2 p-1 pt-2.5 shadow-sm">
      {/* Header */}
      <div className="bg-background absolute top-3 w-full rounded-tl-xl p-4">
        <div className={'bg-background flex w-full items-center gap-2'}>
          <button
            onClick={toggleCollapsed}
            className={cn(
              'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md',
            )}
          >
            <PanelLeft className="h-4 w-4 transition-transform duration-300" />
          </button>

          <div className="bg-muted-foreground h-4 w-0.5 rounded-md"></div>

          <div className="flex gap-2">
            {TABS.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-sidebar-accent',
                  )}
                >
                  <Icon className="h-4 w-4 transition-transform duration-300" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-10 flex-1">
        {activeTab === 'dashboard' && <DashboardPanel />}
        {activeTab === 'documents' && <DocumentPanel />}
      </div>
    </main>
  );
};

export default RightPanel;
