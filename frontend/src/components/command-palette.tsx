import { useEffect, useState, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Command } from '../hooks/use-command-palette';

type CommandPaletteProps = {
  onClose: () => void;
  commands: Command[];
};

const CommandPalette = ({ onClose, commands }: CommandPaletteProps) => {
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
    <>
      <div
        className="bg-foreground/20 fixed inset-0 z-50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="border-border bg-popover fixed top-[20%] left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-lg border shadow-lg"
        role="dialog"
        aria-label="Command menu"
      >
        <div className="border-border flex items-center gap-2 border-b px-3">
          <Search className="text-muted-foreground h-4 w-4 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="text-foreground placeholder:text-muted-foreground w-full bg-transparent py-3 text-[13px] outline-none"
          />
        </div>
        <ul className="max-h-64 overflow-y-auto p-1" role="listbox">
          {filtered.length === 0 ? (
            <li className="text-muted-foreground px-3 py-4 text-center text-[13px]">
              No commands found
            </li>
          ) : (
            filtered.map((cmd, i) => (
              <li key={cmd.id} role="option" aria-selected={i === selectedIndex}>
                <button
                  type="button"
                  onClick={() => execute(cmd)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors',
                    i === selectedIndex ? 'bg-muted' : 'hover:bg-muted/60',
                  )}
                >
                  {cmd.icon && (
                    <cmd.icon className="text-muted-foreground h-4 w-4 shrink-0" />
                  )}
                  <span className="flex-1">{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="text-muted-foreground font-mono text-[10px]">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
};

export default CommandPalette;
