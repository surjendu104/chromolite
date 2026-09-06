import React from 'react';
import { cn } from '../../lib/utils';
import { Tooltip } from './tooltip';

export type MetricSize = 'compact' | 'standard' | 'prominent';

export interface MetricProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  description?: string;
  tooltip?: string;
  badge?: React.ReactNode;
  size?: MetricSize;
  className?: string;
}

export const Metric: React.FC<MetricProps> = ({
  label,
  value,
  unit,
  description,
  tooltip,
  badge,
  size = 'standard',
  className,
}) => {
  const valueSizes: Record<MetricSize, string> = {
    compact: 'text-[16px]',
    standard: 'text-[22px]',
    prominent: 'text-[28px]',
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-text-muted font-mono text-[11px] font-medium tracking-wider uppercase select-none">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {badge}
          {tooltip && <Tooltip content={tooltip} title={label} />}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-foreground font-mono font-semibold tracking-tight tabular-nums',
            valueSizes[size],
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-text-secondary font-mono text-[12px] font-normal">
            {unit}
          </span>
        )}
      </div>

      {description && (
        <span className="text-text-secondary text-[12px] leading-normal">
          {description}
        </span>
      )}
    </div>
  );
};
