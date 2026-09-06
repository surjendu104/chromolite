import React from 'react';
import { cn } from '../../lib/utils';
import { Button, type ButtonProps } from './button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-sm flex-col items-center justify-center p-8 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="border-border bg-surface-subtle text-text-muted mb-3 flex h-9 w-9 items-center justify-center rounded-md border">
          <Icon className="h-4 w-4" />
        </div>
      )}

      <h3 className="text-foreground text-[14px] font-semibold tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-text-secondary mt-1 text-[13px] leading-normal">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-2">
          {action && (
            <Button
              size="sm"
              variant={action.variant || 'secondary'}
              onClick={action.onClick}
              leftIcon={action.icon}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
