import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  mono?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  mono = false,
  children,
  ...props
}) => {
  const sizeClasses: Record<BadgeSize, string> = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1 rounded-[4px]',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 rounded-[4px]',
    md: 'text-[12px] px-2.5 py-1 gap-1.5 rounded-[5px]',
  };

  const variantClasses: Record<BadgeVariant, string> = {
    neutral: 'bg-surface-subtle border-border text-text-secondary',
    accent: 'bg-accent-subtle border-accent-border text-accent font-medium',
    success: 'bg-success-subtle border-success-border text-success font-medium',
    warning: 'bg-warning-subtle border-warning-border text-warning font-medium',
    error: 'bg-error-subtle border-error-border text-error font-medium',
    info: 'bg-info-subtle border-info-border text-info font-medium',
  };

  const dotClasses: Record<BadgeVariant, string> = {
    neutral: 'bg-text-muted',
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center border leading-none font-normal select-none',
        mono ? 'font-mono' : 'font-sans',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            dotClasses[variant],
          )}
        />
      )}
      {children}
    </span>
  );
};
