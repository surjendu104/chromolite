import React from 'react';
import { cn } from '../../lib/utils';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  subtle?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  className,
  subtle = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'border-border overflow-hidden rounded-lg border transition-colors',
        subtle ? 'bg-surface-subtle' : 'bg-surface',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface PanelHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  className,
  title,
  description,
  actions,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'border-border flex items-center justify-between gap-4 border-b px-4 py-3',
        className,
      )}
      {...props}
    >
      {children || (
        <>
          <div className="min-w-0">
            {title && (
              <h3 className="text-foreground truncate text-[13px] font-semibold tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-text-secondary mt-0.5 truncate text-[12px]">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
          )}
        </>
      )}
    </div>
  );
};

export const PanelBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  );
};

export const PanelFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'border-border bg-surface-subtle/50 text-text-secondary flex items-center justify-between border-t px-4 py-2.5 text-[12px]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
