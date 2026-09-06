import React from 'react';
import { cn } from '../../lib/utils';

export type StatusType = 'healthy' | 'warning' | 'error' | 'active' | 'idle';

export interface StatusDotProps {
  status?: StatusType;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status = 'healthy',
  label,
  pulse = false,
  className,
}) => {
  const dotColor: Record<StatusType, string> = {
    healthy: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    active: 'bg-accent',
    idle: 'bg-text-muted',
  };

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-[12px]', className)}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              dotColor[status],
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-1.5 w-1.5 rounded-full',
            dotColor[status],
          )}
        />
      </span>
      {label && <span className="text-text-secondary">{label}</span>}
    </span>
  );
};
