import { Database, Command } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../lib/utils';
import { getCollections as getCollectionsApi } from '../service/collection.service';
import { useCollectionStore } from '../store/collection.store';
import { useSidebarStore } from '../store/sidebar.store';

type SidebarProps = {
  onOpenCommandPalette?: () => void;
};

const Sidebar = ({ onOpenCommandPalette }: SidebarProps) => {
  const { collapsed } = useSidebarStore();
  const { collections, setCollections, setActiveCollection, activeCollection, activeCollectionDetails } =
    useCollectionStore();
  const { setActiveTab } = useSidebarStore();

  useEffect(() => {
    const load = async () => {
      try {
        const responseData = await getCollectionsApi();
        setCollections(responseData);
        if (responseData.length > 0 && !useCollectionStore.getState().activeCollection) {
          setActiveCollection(responseData[0]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [setCollections, setActiveCollection]);

  const handleCollectionClick = (collection: (typeof collections)[0]) => {
    setActiveCollection(collection);
    setActiveTab('documents');
  };

  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground relative flex h-full shrink-0 flex-col overflow-hidden border-sidebar-border border-r',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-0 border-0' : 'w-[240px]',
      )}
    >
      <div
        className={cn(
          'flex h-12 shrink-0 items-center px-4',
          collapsed && 'opacity-0',
        )}
      >
        <span className="text-[15px] font-semibold tracking-tight">Chromolite</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <div
          className={cn(
            'text-muted-foreground mb-1.5 px-2 text-[11px] font-semibold tracking-wider uppercase',
            collapsed && 'hidden',
          )}
        >
          Collections
        </div>

        <ul className="flex flex-col gap-0.5" role="listbox" aria-label="Collections">
          {collections.map((collection) => {
            const isActive = activeCollection?.id === collection.id;
            const count =
              isActive && activeCollectionDetails
                ? activeCollectionDetails.document_count
                : null;

            return (
              <li key={collection.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleCollectionClick(collection)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent',
                    collapsed && 'hidden',
                  )}
                >
                  <Database className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                  {count !== null && (
                    <span
                      className={cn(
                        'font-mono text-[11px] tabular-nums',
                        isActive ? 'opacity-70' : 'text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          'border-sidebar-border shrink-0 border-t px-2 py-2',
          collapsed && 'hidden',
        )}
      >
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors"
        >
          <Command className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Command menu</span>
          <kbd className="border-border bg-muted rounded px-1 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
