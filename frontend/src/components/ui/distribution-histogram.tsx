import React, { useState } from 'react';
import type { HistogramData } from '../../store/analysis.types';

interface DistributionHistogramProps {
  data: HistogramData;
  height?: number;
  label?: string;
  xUnit?: string;
  median?: number;
  p05?: number;
  p95?: number;
}

export const DistributionHistogram: React.FC<DistributionHistogramProps> = ({
  data,
  height = 140,
  label,
  xUnit = '',
  median,
  p05,
  p95,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.counts.length === 0) {
    return (
      <div
        style={{ height }}
        className="text-text-muted flex items-center justify-center font-mono text-[12px]"
      >
        No histogram data available
      </div>
    );
  }

  const maxCount = Math.max(...data.counts, 1);
  const totalCount = data.counts.reduce((a, b) => a + b, 0);

  const minBin = data.bins[0];
  const maxBin = data.bins[data.bins.length - 1];
  const binRange = maxBin - minBin || 1;

  const margin = { top: 12, right: 12, bottom: 24, left: 36 };
  const svgHeight = height;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  const getXPercent = (val: number) => {
    return Math.max(0, Math.min(100, ((val - minBin) / binRange) * 100));
  };

  return (
    <div className="w-full select-none">
      {label && (
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-text-secondary font-sans">{label}</span>
          <span className="text-text-muted font-mono">
            {totalCount.toLocaleString()} samples
          </span>
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={`0 0 400 ${svgHeight}`}
          className="w-full overflow-visible"
          style={{ height: `${svgHeight}px` }}
          preserveAspectRatio="none"
        >
          {/* Subtle Grid Lines */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={400 - margin.right}
            y2={margin.top}
            stroke="var(--border)"
            strokeDasharray="2 3"
            strokeWidth="0.75"
          />
          <line
            x1={margin.left}
            y1={margin.top + chartHeight / 2}
            x2={400 - margin.right}
            y2={margin.top + chartHeight / 2}
            stroke="var(--border)"
            strokeDasharray="2 3"
            strokeWidth="0.75"
          />
          <line
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={400 - margin.right}
            y2={margin.top + chartHeight}
            stroke="var(--border-strong)"
            strokeWidth="1"
          />

          {/* Histogram Bars */}
          {data.counts.map((count, i) => {
            const barLeft =
              margin.left +
              ((data.bins[i] - minBin) / binRange) *
                (400 - margin.left - margin.right);
            const barRight =
              margin.left +
              ((data.bins[i + 1] - minBin) / binRange) *
                (400 - margin.left - margin.right);
            const barWidth = Math.max(1, barRight - barLeft - 0.5);

            const barHeight = (count / maxCount) * chartHeight;
            const barY = margin.top + chartHeight - barHeight;
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <rect
                  x={barLeft}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  fill={isHovered ? 'var(--accent)' : 'var(--accent)'}
                  opacity={isHovered ? 0.95 : 0.45}
                  rx="1"
                  className="transition-all duration-100"
                />
              </g>
            );
          })}

          {/* Median Marker Line */}
          {median !== undefined && (
            <g>
              <line
                x1={
                  margin.left +
                  (getXPercent(median) / 100) *
                    (400 - margin.left - margin.right)
                }
                y1={margin.top}
                x2={
                  margin.left +
                  (getXPercent(median) / 100) *
                    (400 - margin.left - margin.right)
                }
                y2={margin.top + chartHeight}
                stroke="var(--foreground)"
                strokeWidth="1.25"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* P05 and P95 Bounds Markers */}
          {p05 !== undefined && (
            <line
              x1={
                margin.left +
                (getXPercent(p05) / 100) * (400 - margin.left - margin.right)
              }
              y1={margin.top + chartHeight * 0.25}
              x2={
                margin.left +
                (getXPercent(p05) / 100) * (400 - margin.left - margin.right)
              }
              y2={margin.top + chartHeight}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="1 2"
            />
          )}
          {p95 !== undefined && (
            <line
              x1={
                margin.left +
                (getXPercent(p95) / 100) * (400 - margin.left - margin.right)
              }
              y1={margin.top + chartHeight * 0.25}
              x2={
                margin.left +
                (getXPercent(p95) / 100) * (400 - margin.left - margin.right)
              }
              y2={margin.top + chartHeight}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="1 2"
            />
          )}

          {/* X Axis Range Labels */}
          <text
            x={margin.left}
            y={svgHeight - 4}
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="start"
          >
            {minBin.toFixed(2)}
            {xUnit}
          </text>
          {median !== undefined && (
            <text
              x={
                margin.left +
                (getXPercent(median) / 100) * (400 - margin.left - margin.right)
              }
              y={svgHeight - 4}
              fill="var(--foreground)"
              fontSize="10"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
              fontWeight="500"
            >
              med: {median.toFixed(2)}
            </text>
          )}
          <text
            x={400 - margin.right}
            y={svgHeight - 4}
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="end"
          >
            {maxBin.toFixed(2)}
            {xUnit}
          </text>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && (
          <div className="bg-popover text-popover-foreground border-border absolute top-2 right-2 rounded border px-2 py-1 font-mono text-[11px] shadow-sm select-none">
            <span className="text-text-muted">Range: </span>
            <span className="text-foreground">
              [{data.bins[hoveredIndex].toFixed(3)} –{' '}
              {data.bins[hoveredIndex + 1].toFixed(3)}]
            </span>
            <div className="text-accent mt-0.5">
              {data.counts[hoveredIndex].toLocaleString()} vectors (
              {((data.counts[hoveredIndex] / totalCount) * 100).toFixed(1)}%)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DistributionHistogram;
