"use client";

import { Construction, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceholderCardProps {
  title: string;
  kpiNumber: string;
  status: "under-construction" | "coming-soon";
  description?: string;
  className?: string;
}

export function PlaceholderCard({
  title,
  kpiNumber,
  status,
  description,
  className,
}: PlaceholderCardProps) {
  const isUnderConstruction = status === "under-construction";
  const Icon = isUnderConstruction ? Construction : Clock;
  const label = isUnderConstruction ? "In Arbeit" : "Kommt bald";
  const borderColor = isUnderConstruction
    ? "border-amber-200"
    : "border-slate-200";
  const bgColor = isUnderConstruction ? "bg-amber-50/50" : "bg-slate-50/50";
  const iconColor = isUnderConstruction
    ? "text-amber-500"
    : "text-slate-400";
  const labelColor = isUnderConstruction
    ? "text-amber-700"
    : "text-slate-500";

  return (
    <div
      className={cn(
        "rounded-xl border p-6 transition-all",
        borderColor,
        bgColor,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              {kpiNumber}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                isUnderConstruction
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </span>
          </div>
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg p-2.5",
            isUnderConstruction ? "bg-amber-100" : "bg-slate-100"
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of placeholder cards for a section
 */
export function PlaceholderSection({
  title,
  items,
}: {
  title: string;
  items: PlaceholderCardProps[];
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <PlaceholderCard key={item.kpiNumber} {...item} />
        ))}
      </div>
    </section>
  );
}
