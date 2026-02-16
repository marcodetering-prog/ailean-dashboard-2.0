"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import {
  type ThresholdColor,
  getThresholdClasses,
} from "@/lib/utils/thresholds";
import Link from "next/link";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  thresholdColor?: ThresholdColor;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  drillDownHref?: string;
  className?: string;
  isLoading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  thresholdColor,
  trend,
  drillDownHref,
  className,
  isLoading,
}: KPICardProps) {
  const colors = thresholdColor
    ? getThresholdClasses(thresholdColor)
    : null;

  const content = (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 transition-all",
        colors ? colors.border : "border-border",
        drillDownHref && "cursor-pointer hover:shadow-md hover:border-ring/50",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "rounded-lg p-2.5",
              colors ? colors.bg : "bg-muted"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                colors ? colors.text : "text-muted-foreground"
              )}
            />
          </div>
        )}
      </div>

      {/* Trend indicator */}
      {trend && !isLoading && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">
            {trend.label}
          </span>
        </div>
      )}

      {/* Threshold indicator dot */}
      {colors && !isLoading && (
        <div className="mt-3 flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", colors.dot)} />
          <span className={cn("text-xs font-medium", colors.text)}>
            {thresholdColor === "green"
              ? "Im Zielbereich"
              : thresholdColor === "amber"
              ? "Aufmerksamkeit erforderlich"
              : thresholdColor === "red"
              ? "Kritisch"
              : ""}
          </span>
        </div>
      )}
    </div>
  );

  if (drillDownHref) {
    return <Link href={drillDownHref}>{content}</Link>;
  }

  return content;
}

/**
 * Grid container for KPI cards
 */
export function KPIGrid({
  children,
  columns = 3,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-4", colClasses[columns], className)}>
      {children}
    </div>
  );
}
