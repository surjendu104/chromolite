import { useEffect } from 'react';
import {
  Database,
  LayoutGrid,
  FileText,
  Activity,
  GitFork,
  Radio,
  Compass,
  Layers,
  Search,
  Sliders,
  Copy,
  Command,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getCollections as getCollectionsApi } from '../service/collection.service';
import { useCollectionStore } from '../store/collection.store';
import { useSidebarStore, type TabId } from '../store/sidebar.store';
import { SectionLabel } from './ui/section-label';

type SidebarProps = {
  onOpenCommandPalette?: () => void;
};

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isReady?: boolean;
}

const COLLECTION_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid, isReady: true },
  { id: 'documents', label: 'Documents', icon: FileText, isReady: true },
  { id: 'embeddings', label: 'Embeddings', icon: Compass, isReady: true },
];

const ANALYSIS_NAV: NavItem[] = [
  { id: 'similarity', label: 'Similarity', icon: Activity, isReady: true },
  { id: 'neighbors', label: 'Neighbors', icon: Radio, isReady: true },
  { id: 'clusters', label: 'Clusters', icon: Layers, isReady: false },
  { id: 'outliers', label: 'Outliers', icon: GitFork, isReady: false },
  { id: 'duplicates', label: 'Duplicates', icon: Copy, isReady: false },
];

const RETRIEVAL_NAV: NavItem[] = [
  { id: 'queries', label: 'Queries', icon: Search, isReady: false },
  { id: 'evaluation', label: 'Evaluation', icon: Sliders, isReady: false },
];

export const Sidebar = ({ onOpenCommandPalette }: SidebarProps) => {
  const { collapsed, activeTab, setActiveTab } = useSidebarStore();
  const {
    collections,
    setCollections,
    setActiveCollection,
    activeCollection,
    activeCollectionDetails,
  } = useCollectionStore();

  useEffect(() => {
    const load = async () => {
      try {
        const responseData = await getCollectionsApi();
        setCollections(responseData);
        if (
          responseData.length > 0 &&
          !useCollectionStore.getState().activeCollection
        ) {
          setActiveCollection(responseData[0]);
        }
      } catch (error) {
        console.error('Failed to load Chroma collections', error);
      }
    };
    load();
  }, [setCollections, setActiveCollection]);

  const handleCollectionClick = (collection: (typeof collections)[0]) => {
    setActiveCollection(collection);
  };

  return (
    <aside
      className={cn(
        'bg-sidebar text-text-primary border-border relative flex h-full shrink-0 flex-col overflow-hidden border-r select-none',
        'transition-[width] duration-150 ease-out',
        collapsed ? 'w-0 border-0' : 'w-[230px]',
      )}
    >
      {/* App Header */}
      <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-3.5">
        <div className="flex items-center gap-2">
          <div className="bg-accent text-accent-foreground flex h-5 w-5 items-center justify-center rounded-[4px] font-mono text-[11px] font-bold">
            C
          </div>
          <span className="text-foreground font-sans text-[14px] font-semibold tracking-tight">
            Chromolite
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-success h-1.5 w-1.5 rounded-full" />
          <span className="text-text-muted font-mono text-[10px] tracking-wider uppercase">
            LOCAL
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-2.5 py-3">
        {/* Collections List */}
        <section>
          <div className="mb-1.5 flex items-center justify-between px-2">
            <SectionLabel mono>Collections</SectionLabel>
            <span className="text-text-muted font-mono text-[10px]">
              {collections.length}
            </span>
          </div>

          <ul
            className="flex flex-col gap-0.5"
            role="listbox"
            aria-label="Collections"
          >
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
                      'group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors',
                      isActive
                        ? 'bg-surface text-foreground shadow-subtle border-border border font-medium'
                        : 'text-text-secondary hover:text-foreground hover:bg-surface-subtle/70 border border-transparent',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Database
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-colors',
                          isActive
                            ? 'text-accent'
                            : 'text-text-muted group-hover:text-text-secondary',
                        )}
                      />
                      <span className="truncate font-sans font-medium">
                        {collection.name}
                      </span>
                    </div>

                    {count !== null && (
                      <span className="text-text-muted font-mono text-[11px] tabular-nums">
                        {count.toLocaleString()}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Selected Collection Navigation */}
        {activeCollection && (
          <>
            {/* Core Collection views */}
            <section className="border-border/70 border-t pt-3">
              <div className="mb-1.5 px-2">
                <SectionLabel mono>Collection</SectionLabel>
              </div>
              <ul className="flex flex-col gap-0.5">
                {COLLECTION_NAV.map((nav) => {
                  const isActive = activeTab === nav.id;
                  const Icon = nav.icon;

                  return (
                    <li key={nav.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(nav.id)}
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left font-sans text-[12.5px] transition-colors',
                          isActive
                            ? 'bg-surface text-foreground shadow-subtle border-border border font-medium'
                            : 'text-text-secondary hover:text-foreground hover:bg-surface-subtle/70 border border-transparent',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5',
                              isActive ? 'text-accent' : 'text-text-muted',
                            )}
                          />
                          <span>{nav.label}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Analysis Views */}
            <section className="border-border/70 border-t pt-3">
              <div className="mb-1.5 flex items-center justify-between px-2">
                <SectionLabel mono>Analysis</SectionLabel>
              </div>
              <ul className="flex flex-col gap-0.5">
                {ANALYSIS_NAV.map((nav) => {
                  const isActive = activeTab === nav.id;
                  const Icon = nav.icon;

                  return (
                    <li key={nav.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(nav.id)}
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left font-sans text-[12.5px] transition-colors',
                          isActive
                            ? 'bg-surface text-foreground shadow-subtle border-border border font-medium'
                            : 'text-text-secondary hover:text-foreground hover:bg-surface-subtle/70 border border-transparent',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5',
                              isActive ? 'text-accent' : 'text-text-muted',
                            )}
                          />
                          <span>{nav.label}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Retrieval Views */}
            <section className="border-border/70 border-t pt-3">
              <div className="mb-1.5 px-2">
                <SectionLabel mono>Retrieval</SectionLabel>
              </div>
              <ul className="flex flex-col gap-0.5">
                {RETRIEVAL_NAV.map((nav) => {
                  const isActive = activeTab === nav.id;
                  const Icon = nav.icon;

                  return (
                    <li key={nav.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(nav.id)}
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left font-sans text-[12.5px] transition-colors',
                          isActive
                            ? 'bg-surface text-foreground shadow-subtle border-border border font-medium'
                            : 'text-text-secondary hover:text-foreground hover:bg-surface-subtle/70 border border-transparent',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5',
                              isActive ? 'text-accent' : 'text-text-muted',
                            )}
                          />
                          <span>{nav.label}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>

      {/* Command Palette Button */}
      <div className="border-border bg-sidebar border-t p-2">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="text-text-secondary hover:text-foreground hover:bg-surface hover:border-border flex w-full cursor-pointer items-center gap-2 rounded-md border border-transparent px-2.5 py-1.5 text-[12px] transition-colors"
        >
          <Command className="text-text-muted h-3.5 w-3.5" />
          <span className="flex-1 text-left font-sans">Command menu</span>
          <kbd className="border-border bg-surface text-text-muted inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[10px]">
            <span>⌘K</span>
          </kbd>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
