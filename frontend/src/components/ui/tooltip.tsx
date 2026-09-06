import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { HelpCircle } from 'lucide-react';

export interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  title,
  side = 'top',
  className,
}) => {
  const [visible, setVisible] = useState(false);

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <div
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children || (
        <button
          type="button"
          aria-label="Info"
          className="text-text-muted hover:text-text-secondary inline-flex cursor-help items-center rounded p-0.5 transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}

      {visible && (
        <div
          role="tooltip"
          className={cn(
            'border-border bg-surface-elevated shadow-popover text-foreground pointer-events-none absolute z-50 w-max max-w-xs rounded-md border p-2 text-[12px] leading-relaxed',
            positionClasses[side],
          )}
        >
          {title && (
            <div className="text-text-muted mb-1 font-mono text-[10px] font-semibold tracking-wider uppercase">
              {title}
            </div>
          )}
          <div className="text-text-secondary">{content}</div>
        </div>
      )}
    </div>
  );
};
