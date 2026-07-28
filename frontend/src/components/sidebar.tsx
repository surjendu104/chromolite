import { Database } from 'lucide-react';
import { useSidebarStore } from '../store/sidebar.store';
import { cn } from '../lib/utils';
import { useEffect } from 'react';
import { getCollections as getCollectionsApi } from '../service/collection.service';
import { useCollectionStore } from '../store/collection.store';

const Sidebar = () => {
  const { collapsed } = useSidebarStore();

  const { collections, setCollections, setActiveCollection, activeCollection } =
    useCollectionStore();

  useEffect(() => {
    const getCollections = async () => {
      try {
        const responseData = await getCollectionsApi();
        console.log(responseData);
        setCollections(responseData);
      } catch (error) {
        console.log(error);
      }
    };

    getCollections();
  }, [setCollections]);

  return (
    <aside
      className={cn(
        'group/sidebar bg-sidebar text-sidebar-foreground relative flex h-screen flex-col',
        'transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-2.5 border-0' : 'w-60',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'border-sidebar-border flex h-14 items-center px-4',
          // collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 overflow-hidden transition-all duration-300',
            collapsed ? 'w-0 opacity-0' : 'w-full opacity-100',
          )}
        >
          <span className="truncate text-lg font-medium">Chromolite</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div
          className={cn(
            'text-muted-foreground mb-2 text-[12px] font-medium',
            collapsed && 'hidden',
          )}
        >
          Collections
        </div>

        <ul className="flex flex-col gap-2 p-0.5">
          {collections.map((collection, idx) => {
            const isActive = activeCollection?.id === collection.id;
            return (
              <li
                key={idx}
                onClick={() => setActiveCollection(collection)}
                className={cn(
                  'bg-sidebar text-sidebar-foreground flex cursor-pointer items-center gap-2 rounded-sm p-1.5 text-sm',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-accent'
                    : 'hover:bg-sidebar-accent',
                  collapsed && 'hidden',
                )}
              >
                <Database className="h-4 w-4" />
                <span className="flex-1 overflow-hidden text-ellipsis">
                  {collection.name}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
