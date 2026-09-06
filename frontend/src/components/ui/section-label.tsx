import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionLabelProps extends React.HTMLAttributes<HTMLHeadingElement> {
  mono?: boolean;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  children,
  className,
  mono = true,
  ...props
}) => (
  <h4
    className={cn(
      'text-text-muted text-[11px] font-medium tracking-wider uppercase select-none',
      mono ? 'font-mono' : 'font-sans font-semibold',
      className,
    )}
    {...props}
  >
    {children}
  </h4>
);

export interface SectionHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className,
  ...props
}) => (
  <div
    className={cn('mb-3 flex items-start justify-between gap-4', className)}
    {...props}
  >
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-foreground text-[14px] font-semibold tracking-tight">
          {title}
        </h3>
        {badge}
      </div>
      {description && (
        <p className="text-text-secondary mt-0.5 text-[12px] leading-normal">
          {description}
        </p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
    )}
  </div>
);
