import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: 'underline' | 'segment';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}: TabsProps<T>) {
  if (variant === 'segment') {
    return (
      <div
        className={cn(
          'border-border bg-surface-subtle inline-flex items-center gap-0.5 rounded-md border p-0.5',
          className,
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 py-1 font-sans text-[12px] transition-colors select-none',
                isActive
                  ? 'bg-surface text-foreground shadow-subtle font-medium'
                  : 'text-text-secondary hover:text-foreground hover:bg-surface/50',
                tab.disabled &&
                  'pointer-events-none cursor-not-allowed opacity-40',
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="font-mono text-[11px] opacity-70">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-border flex items-center gap-1 border-b',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative -mb-px inline-flex cursor-pointer items-center gap-1.5 px-3 py-2 font-sans text-[13px] transition-colors select-none',
              isActive
                ? 'text-foreground border-accent border-b-2 font-medium'
                : 'text-text-secondary hover:text-foreground hover:border-border border-b-2 border-transparent',
              tab.disabled &&
                'pointer-events-none cursor-not-allowed opacity-40',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-text-muted font-mono text-[11px]">
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
