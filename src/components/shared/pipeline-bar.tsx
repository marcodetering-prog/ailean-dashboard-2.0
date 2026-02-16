"use client";

import { cn } from "@/lib/utils";
import { pipelineStateColors } from "@/lib/constants/kpi-config";

interface PipelineSegment {
  label: string;
  count: number;
  category?: string;
  color?: string;
}

interface PipelineBarProps {
  segments: PipelineSegment[];
  title?: string;
  className?: string;
}

export function PipelineBar({
  segments,
  title,
  className,
}: PipelineBarProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground">
          {title}
        </h3>
      )}

      {/* Bar */}
      <div className="flex h-8 rounded-lg overflow-hidden bg-muted">
        {segments
          .filter((s) => s.count > 0)
          .map((segment, i) => {
            const width = (segment.count / total) * 100;
            const color =
              segment.color ||
              (segment.category
                ? pipelineStateColors[segment.category]
                : undefined) ||
              `hsl(${(i * 60) % 360}, 70%, 55%)`;

            return (
              <div
                key={i}
                className="relative group flex items-center justify-center text-white text-xs font-medium transition-all hover:opacity-90"
                style={{
                  width: `${width}%`,
                  backgroundColor: color,
                  minWidth: width > 3 ? undefined : "12px",
                }}
              >
                {width > 8 && (
                  <span className="truncate px-1">{segment.count}</span>
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg whitespace-nowrap">
                    <div className="font-medium">{segment.label}</div>
                    <div>
                      {segment.count} ({((segment.count / total) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments
          .filter((s) => s.count > 0)
          .map((segment, i) => {
            const color =
              segment.color ||
              (segment.category
                ? pipelineStateColors[segment.category]
                : undefined) ||
              `hsl(${(i * 60) % 360}, 70%, 55%)`;

            return (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">
                  {segment.label}: {segment.count}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
