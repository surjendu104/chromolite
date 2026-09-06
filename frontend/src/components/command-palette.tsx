import { useEffect, useState, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import type { Command } from '../hooks/use-command-palette';

type CommandPaletteProps = {
  onClose: () => void;
  commands: Command[];
};

export const CommandPalette = ({ onClose, commands }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(query.toLowerCase())),
  );

  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const execute = useCallback(
    (cmd: Command) => {
      cmd.action();
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        execute(filtered[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, execute, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <div
        className="bg-background/60 fixed inset-0 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        className="border-border bg-surface-elevated shadow-popover relative z-10 w-full max-w-lg overflow-hidden rounded-lg border"
        role="dialog"
        aria-label="Command palette"
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
      >
        {/* Search Input Bar */}
        <div className="border-border bg-surface flex items-center gap-2.5 border-b px-3.5">
          <Search className="text-text-muted h-4 w-4 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to view..."
            className="text-foreground placeholder:text-text-muted w-full bg-transparent py-3 font-sans text-[13px] outline-none"
          />
          <kbd className="text-text-muted bg-surface-subtle border-border rounded border px-1.5 py-0.5 font-mono text-[10px]">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <ul
          className="max-h-72 space-y-0.5 overflow-y-auto p-1.5"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="text-text-muted px-3 py-6 text-center font-sans text-[13px]">
              No matching commands
            </li>
          ) : (
            filtered.map((cmd, i) => {
              const isSelected = i === selectedIndex;
              const Icon = cmd.icon;

              return (
                <li key={cmd.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => execute(cmd)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-md px-3 py-2 text-left text-[12.5px] transition-colors',
                      isSelected
                        ? 'bg-surface-subtle text-foreground font-medium'
                        : 'text-text-secondary hover:bg-surface-subtle/60 hover:text-foreground',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {Icon && (
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'text-accent' : 'text-text-muted',
                          )}
                        />
                      )}
                      <span className="truncate font-sans">{cmd.label}</span>
                    </div>

                    {cmd.shortcut && (
                      <kbd className="text-text-muted bg-surface border-border shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10.5px]">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer info */}
        <div className="border-border bg-surface-subtle/50 text-text-muted flex items-center justify-between border-t px-3.5 py-2 font-sans text-[11px] select-none">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> select
            </span>
          </div>
          <span className="font-mono">Chromolite CLI v0.1.4</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CommandPalette;
