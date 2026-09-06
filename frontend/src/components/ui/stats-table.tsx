import React from 'react';
import type { DistributionStats } from '../../store/analysis.types';
import { cn } from '../../lib/utils';

interface StatsTableProps {
  stats: DistributionStats;
  className?: string;
  decimals?: number;
}

export const StatsTable: React.FC<StatsTableProps> = ({
  stats,
  className,
  decimals = 3,
}) => {
  const items = [
    { label: 'Min', value: stats.min },
    { label: 'P01', value: stats.p01 },
    { label: 'P05', value: stats.p05 },
    { label: 'P25', value: stats.p25 },
    { label: 'Median', value: stats.median, highlight: true },
    { label: 'P75', value: stats.p75 },
    { label: 'P95', value: stats.p95 },
    { label: 'P99', value: stats.p99 },
    { label: 'Max', value: stats.max },
    { label: 'Mean', value: stats.mean, highlight: true },
    { label: 'Std Dev', value: stats.std },
  ];

  return (
    <div
      className={cn(
        'border-border divide-border bg-surface-subtle/40 grid grid-cols-2 divide-x divide-y rounded-md border text-[12px] sm:grid-cols-4 md:grid-cols-6',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="p-2.5">
          <div className="text-text-secondary font-sans text-[11px]">
            {item.label}
          </div>
          <div
            className={cn(
              'mt-0.5 font-mono text-[12.5px] tabular-nums',
              item.highlight
                ? 'text-foreground font-semibold'
                : 'text-text-primary',
            )}
          >
            {item.value.toFixed(decimals)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsTable;
