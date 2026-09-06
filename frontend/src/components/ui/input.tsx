import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, mono = false, leftIcon, rightElement, disabled, ...props },
    ref,
  ) => {
    return (
      <div className="relative inline-flex w-full items-center">
        {leftIcon && (
          <div className="text-text-muted pointer-events-none absolute left-2.5 flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'border-border bg-surface text-foreground placeholder:text-text-muted h-8 w-full rounded-md border px-2.5 py-1 text-[13px] transition-colors',
            'focus:border-accent focus:ring-accent/30 focus:ring-1 focus:outline-none',
            'disabled:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50',
            mono ? 'font-mono text-[12px]' : 'font-sans',
            leftIcon ? 'pl-8' : '',
            rightElement ? 'pr-8' : '',
            className,
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onChange,
      onClear,
      placeholder = 'Search...',
      shortcut = '/',
      ...props
    },
    ref,
  ) => {
    return (
      <div className="relative inline-flex w-full items-center">
        <Search className="text-text-muted pointer-events-none absolute left-2.5 h-3.5 w-3.5" />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'border-border bg-surface text-foreground placeholder:text-text-muted h-8 w-full rounded-md border py-1 pr-14 pl-8 font-sans text-[13px] transition-colors',
            'focus:border-accent focus:ring-accent/30 focus:ring-1 focus:outline-none',
            className,
          )}
          {...props}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-text-muted hover:text-foreground rounded p-0.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : shortcut ? (
            <kbd className="border-border bg-surface-subtle text-text-muted pointer-events-none rounded border px-1.5 py-0.5 font-mono text-[10px] select-none">
              {shortcut}
            </kbd>
          ) : null}
        </div>
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
