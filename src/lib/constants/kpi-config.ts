// ============================================================
// KPI card definitions for the Overview page hero cards
// ============================================================

import {
  MessageSquare,
  FileText,
  Brain,
  Zap,
  Clock,
  Timer,
  type LucideIcon,
} from "lucide-react";

export interface KPICardConfig {
  key: string;
  title: string;
  icon: LucideIcon;
  unit: "count" | "percent" | "score" | "seconds" | "minutes" | "chf";
  /** If true, lower values are better */
  inverseThreshold?: boolean;
  /** Link to drill-down page */
  drillDownHref?: string;
}

export const overviewHeroCards: KPICardConfig[] = [
  {
    key: "totalEvents",
    title: "Gesamte Anfragen",
    icon: MessageSquare,
    unit: "count",
    drillDownHref: "/berichte",
  },
  {
    key: "deficiencyReportRate",
    title: "Maengelberichte",
    icon: FileText,
    unit: "percent",
    drillDownHref: "/maengel",
  },
  {
    key: "avgAiQualityScore",
    title: "AI Qualitaetsscore",
    icon: Brain,
    unit: "score",
    drillDownHref: "/ai-performance",
  },
  {
    key: "automationRate",
    title: "Automatisierungsrate",
    icon: Zap,
    unit: "percent",
    drillDownHref: "/ai-performance",
  },
  {
    key: "avgFirstResponseSec",
    title: "Erste Antwort",
    icon: Clock,
    unit: "seconds",
    inverseThreshold: true,
    drillDownHref: "/ai-performance",
  },
  {
    key: "avgDurationMin",
    title: "Durchschn. Dauer",
    icon: Timer,
    unit: "minutes",
    inverseThreshold: true,
    drillDownHref: "/ai-performance",
  },
];

export const executiveHeroCards: KPICardConfig[] = [
  {
    key: "avgAiQualityScore",
    title: "AI Qualitaetsscore",
    icon: Brain,
    unit: "score",
    drillDownHref: "/ai-performance",
  },
  {
    key: "automationRate",
    title: "Automatisierungsrate",
    icon: Zap,
    unit: "percent",
    drillDownHref: "/ai-performance",
  },
  {
    key: "bugRate",
    title: "Bug Rate",
    icon: Brain,
    unit: "percent",
    inverseThreshold: true,
    drillDownHref: "/ai-performance",
  },
  {
    key: "loopDetectionRate",
    title: "Loop Rate",
    icon: Brain,
    unit: "percent",
    inverseThreshold: true,
    drillDownHref: "/ai-performance",
  },
  {
    key: "misunderstandingRate",
    title: "Missverstaendnisrate",
    icon: Brain,
    unit: "percent",
    inverseThreshold: true,
    drillDownHref: "/ai-performance",
  },
  {
    key: "avgFirstResponseSec",
    title: "Erste Antwort",
    icon: Clock,
    unit: "seconds",
    inverseThreshold: true,
    drillDownHref: "/ai-performance",
  },
];

// Chart color palette for consistent coloring across all charts
export const chartColors = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
  "#a855f7", // violet
];

// Pipeline state colors
export const pipelineStateColors: Record<string, string> = {
  open: "#3b82f6",      // blue
  in_progress: "#f59e0b", // amber
  resolved: "#22c55e",   // green
  closed: "#6b7280",     // gray
};
