import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { ProjectionPoint } from '../../store/analysis.types';
import { TOKENS } from '../../lib/tokens';

interface EmbeddingScatterCanvasProps {
  points: ProjectionPoint[];
  colorByField?: string | null;
  selectedPointId?: string | null;
  onSelectPoint?: (point: ProjectionPoint | null) => void;
  height?: number | string;
}

export const EmbeddingScatterCanvas: React.FC<EmbeddingScatterCanvasProps> = ({
  points,
  colorByField = null,
  selectedPointId = null,
  onSelectPoint,
  height = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Transform state: offset (x, y) and zoom scale
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1.0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<ProjectionPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Color mapping for metadata categories
  const { colorMap, categories } = useMemo(() => {
    if (!colorByField || points.length === 0) {
      return { colorMap: new Map<string, string>(), categories: [] };
    }

    const counts = new Map<string, number>();
    for (const p of points) {
      const val = p.metadata?.[colorByField];
      const key = val !== undefined && val !== null ? String(val) : 'Unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Sort categories by frequency
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const palette = TOKENS.colors.visualization;
    const map = new Map<string, string>();
    const topCats: { name: string; color: string; count: number }[] = [];

    sorted.slice(0, 9).forEach(([cat, count], idx) => {
      const col = palette[idx % palette.length];
      map.set(cat, col);
      topCats.push({ name: cat, color: col, count });
    });

    if (sorted.length > 9) {
      const otherColor = '#898983';
      map.set('__other__', otherColor);
      const otherCount = sorted.slice(9).reduce((acc, [, c]) => acc + c, 0);
      topCats.push({ name: 'Other', color: otherColor, count: otherCount });
    }

    return { colorMap: map, categories: topCats };
  }, [points, colorByField]);

  // Point color resolver
  const getPointColor = useCallback(
    (point: ProjectionPoint): string => {
      if (colorByField === '__norm__') {
        // Continuous norm color gradient
        const norm = point.norm;
        const normalized = Math.min(1.0, Math.max(0.0, (norm - 0.8) / 0.4));
        const r = Math.round(124 * (1 - normalized) + 47 * normalized);
        const g = Math.round(92 * (1 - normalized) + 158 * normalized);
        const b = Math.round(252 * (1 - normalized) + 104 * normalized);
        return `rgb(${r}, ${g}, ${b})`;
      }

      if (colorByField && colorMap.size > 0) {
        const val = point.metadata?.[colorByField];
        const key = val !== undefined && val !== null ? String(val) : 'Unknown';
        return colorMap.get(key) || colorMap.get('__other__') || '#7C5CFC';
      }

      return '#7C5CFC'; // Default primary accent
    },
    [colorByField, colorMap],
  );

  // Compute bounding box and initial fit
  const fitToBounds = useCallback(() => {
    if (!canvasRef.current || points.length === 0) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 40;

    const scaleX = (width - padding * 2) / rangeX;
    const scaleY = (height - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY, 40);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const offsetX = width / 2 - centerX * scale;
    const offsetY = height / 2 + centerY * scale; // Invert Y for canvas

    setTransform({ x: offsetX, y: offsetY, scale });
  }, [points]);

  useEffect(() => {
    fitToBounds();
  }, [fitToBounds]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Subtle coordinate origin axes
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, transform.y);
    ctx.lineTo(rect.width, transform.y);
    ctx.moveTo(transform.x, 0);
    ctx.lineTo(transform.x, 0 + rect.height);
    ctx.stroke();

    const { x: offsetX, y: offsetY, scale } = transform;
    const pointRadius = Math.max(2.0, Math.min(5.5, 3.0 * Math.sqrt(scale / 15.0)));

    // Draw non-selected points
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.id === selectedPointId) continue; // draw selected last

      const px = offsetX + p.x * scale;
      const py = offsetY - p.y * scale; // invert Y

      // Viewport culling
      if (px < -10 || px > rect.width + 10 || py < -10 || py > rect.height + 10) {
        continue;
      }

      ctx.fillStyle = getPointColor(p);
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(px, py, pointRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Selected Point with pulsing/crisp target ring
    if (selectedPointId) {
      const selPoint = points.find((p) => p.id === selectedPointId);
      if (selPoint) {
        const sx = offsetX + selPoint.x * scale;
        const sy = offsetY - selPoint.y * scale;

        // Outer glow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = 'var(--accent)';
        ctx.beginPath();
        ctx.arc(sx, sy, pointRadius + 8, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = 'var(--accent)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(sx, sy, pointRadius + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = 'var(--foreground)';
        ctx.beginPath();
        ctx.arc(sx, sy, pointRadius + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Hovered Point highlight
    if (hoveredPoint && hoveredPoint.id !== selectedPointId) {
      const hx = offsetX + hoveredPoint.x * scale;
      const hy = offsetY - hoveredPoint.y * scale;

      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = 'var(--foreground)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hx, hy, pointRadius + 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }, [points, transform, selectedPointId, hoveredPoint, getPointColor]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
      setHoveredPoint(null);
      setTooltipPos(null);
      return;
    }

    // Hit-testing hovered point
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { x: offsetX, y: offsetY, scale } = transform;
    const hitRadius = 8;
    let closestPoint: ProjectionPoint | null = null;
    let minDistSq = hitRadius * hitRadius;

    for (const p of points) {
      const px = offsetX + p.x * scale;
      const py = offsetY - p.y * scale;
      const distSq = (mouseX - px) * (mouseX - px) + (mouseY - py) * (mouseY - py);
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestPoint = p;
      }
    }

    if (closestPoint) {
      setHoveredPoint(closestPoint);
      setTooltipPos({ x: mouseX + 12, y: mouseY + 12 });
    } else {
      setHoveredPoint(null);
      setTooltipPos(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredPoint) {
      onSelectPoint?.(hoveredPoint);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.max(2, Math.min(200, transform.scale * zoomFactor));

    // Zoom centered at mouse cursor
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const zoomIn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = Math.min(200, transform.scale * 1.25);
    const newX = cx - (cx - transform.x) * (newScale / transform.scale);
    const newY = cy - (cy - transform.y) * (newScale / transform.scale);
    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const zoomOut = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = Math.max(2, transform.scale * 0.8);
    const newX = cx - (cx - transform.x) * (newScale / transform.scale);
    const newY = cy - (cy - transform.y) * (newScale / transform.scale);
    setTransform({ x: newX, y: newY, scale: newScale });
  };

  return (
    <div
      ref={containerRef}
      className="bg-surface border-border relative h-full w-full overflow-hidden rounded-md border select-none"
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className={`h-full w-full ${isDragging ? 'cursor-grabbing' : hoveredPoint ? 'cursor-pointer' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Floating Canvas Controls */}
      <div className="bg-surface/90 border-border absolute right-3 bottom-3 flex items-center gap-1 rounded-md border p-1 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={zoomIn}
          title="Zoom In"
          aria-label="Zoom in"
          className="text-text-secondary hover:text-foreground hover:bg-surface-subtle flex h-7 w-7 items-center justify-center rounded transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          title="Zoom Out"
          aria-label="Zoom out"
          className="text-text-secondary hover:text-foreground hover:bg-surface-subtle flex h-7 w-7 items-center justify-center rounded transition-colors"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="bg-border h-3.5 w-px mx-0.5" />
        <button
          type="button"
          onClick={fitToBounds}
          title="Fit to Bounds"
          aria-label="Fit to bounds"
          className="text-text-secondary hover:text-foreground hover:bg-surface-subtle flex h-7 w-7 items-center justify-center rounded transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Categorical Legend Overlay */}
      {categories.length > 0 && (
        <div className="bg-surface/90 border-border absolute top-3 left-3 max-w-[220px] rounded-md border p-2 text-[11px] shadow-sm backdrop-blur-sm">
          <div className="text-text-muted mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider">
            Color: {colorByField}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-[140px] pr-1">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-foreground truncate font-sans text-[11.5px]">
                    {cat.name}
                  </span>
                </div>
                <span className="text-text-muted font-mono text-[10.5px]">
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Point Hover Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          className="bg-popover text-popover-foreground border-border pointer-events-none absolute z-20 max-w-xs rounded-md border p-2.5 font-sans text-[11.5px] shadow-md"
          style={{
            left: `${Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 400) - 240)}px`,
            top: `${Math.min(tooltipPos.y, (containerRef.current?.clientHeight || 300) - 120)}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-foreground font-mono text-[11px] font-semibold truncate">
              {hoveredPoint.id}
            </span>
            <span className="text-text-muted font-mono text-[10px]">
              ||v||: {hoveredPoint.norm.toFixed(3)}
            </span>
          </div>
          <div className="text-text-muted font-mono text-[10.5px] mt-0.5">
            2D: ({hoveredPoint.x.toFixed(2)}, {hoveredPoint.y.toFixed(2)})
          </div>
          {hoveredPoint.document && (
            <p className="text-text-secondary mt-1.5 line-clamp-2 text-[11px] leading-snug border-border/60 border-t pt-1">
              {hoveredPoint.document}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default EmbeddingScatterCanvas;
