import React from 'react';
import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  label?: string;
  sublabel?: string;
  variant?: 'spinner' | 'skeleton' | 'bar';
  rows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading...',
  sublabel,
  variant = 'spinner',
  rows = 5,
  className,
}) => {
  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-2 py-2', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="border-border space-y-2 border-b p-4 last:border-b-0"
          >
            <div className="bg-surface-subtle h-4 w-1/3 animate-pulse rounded" />
            <div className="bg-surface-subtle/70 h-3 w-full animate-pulse rounded" />
            <div className="bg-surface-subtle/50 h-3 w-2/3 animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div
        className={cn(
          'mx-auto w-full max-w-md space-y-2 p-6 text-center',
          className,
        )}
      >
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-foreground font-sans font-medium">{label}</span>
          {sublabel && (
            <span className="text-text-muted font-mono">{sublabel}</span>
          )}
        </div>
        <div className="bg-surface-subtle h-1.5 w-full overflow-hidden rounded-full">
          <div className="bg-accent h-full w-1/2 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className,
      )}
    >
      <div className="relative mb-3 flex h-6 w-6 items-center justify-center">
        <div className="border-accent h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
      <p className="text-foreground text-[13px] font-medium">{label}</p>
      {sublabel && (
        <p className="text-text-secondary mt-0.5 text-[12px]">{sublabel}</p>
      )}
    </div>
  );
};
