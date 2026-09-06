import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'h-6 px-2 text-[11px] gap-1 rounded-[4px]',
      sm: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-[5px]',
      md: 'h-8 px-3 text-[13px] gap-1.5 rounded-[6px]',
      lg: 'h-9 px-3.5 text-[13px] gap-2 rounded-[6px]',
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-accent text-accent-foreground hover:bg-accent-hover font-medium shadow-none active:brightness-95 border border-transparent',
      secondary:
        'bg-surface hover:bg-surface-subtle text-foreground border border-border hover:border-border-strong active:bg-surface-subtle/80',
      ghost:
        'bg-transparent hover:bg-surface-subtle text-text-secondary hover:text-foreground border border-transparent',
      danger:
        'bg-error-subtle text-error hover:bg-error/20 border border-error-border font-medium',
      outline:
        'bg-transparent border border-border hover:border-border-strong hover:bg-surface-subtle text-foreground',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center font-sans tracking-tight transition-colors duration-150 select-none',
          'focus-visible:ring-accent focus-visible:border-accent focus-visible:ring-1 focus-visible:outline-none',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
