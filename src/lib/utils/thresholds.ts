// ============================================================
// KPI threshold logic for color-coding (green/amber/red)
// ============================================================

export type ThresholdColor = "green" | "amber" | "red" | "blue";

export interface KPIThreshold {
  /** Value at or above this is green */
  green: number;
  /** Value at or above this is amber (but below green) */
  amber: number;
  /** Everything below amber is red */
}

export interface InverseKPIThreshold {
  /** Value at or below this is green (lower is better) */
  green: number;
  /** Value at or below this is amber */
  amber: number;
  /** Everything above amber is red */
}

// --- Standard thresholds (higher is better) ---

export const thresholds = {
  aiQualityScore: { green: 7.0, amber: 5.0 } as KPIThreshold,
  automationRate: { green: 0.85, amber: 0.70 } as KPIThreshold,
  correctTriageRate: { green: 95, amber: 85 } as KPIThreshold,
  deficiencyReportRate: { green: 50, amber: 30 } as KPIThreshold,
  slaComplianceRate: { green: 90, amber: 75 } as KPIThreshold,
  completionRate: { green: 80, amber: 60 } as KPIThreshold,
} as const;

// --- Inverse thresholds (lower is better) ---

export const inverseThresholds = {
  bugRate: { green: 2, amber: 5 } as InverseKPIThreshold,
  loopRate: { green: 20, amber: 40 } as InverseKPIThreshold,
  misunderstandingRate: { green: 10, amber: 20 } as InverseKPIThreshold,
  avgFirstResponseSec: { green: 30, amber: 60 } as InverseKPIThreshold,
  avgDurationMin: { green: 15, amber: 30 } as InverseKPIThreshold,
  agentTakeoverRate: { green: 10, amber: 15 } as InverseKPIThreshold,
  tenantEffortScore: { green: 2.5, amber: 3.5 } as InverseKPIThreshold,
  avgUnnecessaryQuestions: { green: 1.0, amber: 2.0 } as InverseKPIThreshold,
} as const;

/**
 * Get threshold color for a KPI where HIGHER is better
 */
export function getThresholdColor(
  value: number,
  threshold: KPIThreshold
): ThresholdColor {
  if (value >= threshold.green) return "green";
  if (value >= threshold.amber) return "amber";
  return "red";
}

/**
 * Get threshold color for a KPI where LOWER is better
 */
export function getInverseThresholdColor(
  value: number,
  threshold: InverseKPIThreshold
): ThresholdColor {
  if (value <= threshold.green) return "green";
  if (value <= threshold.amber) return "amber";
  return "red";
}

/**
 * Get Tailwind CSS classes for a threshold color
 */
export function getThresholdClasses(color: ThresholdColor): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (color) {
    case "green":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "amber":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500",
      };
    case "red":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        dot: "bg-red-500",
      };
    case "blue":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
      };
  }
}

/**
 * Get the severity color for deficiency severity levels
 */
export function getSeverityColor(
  severity: string
): ThresholdColor {
  switch (severity) {
    case "critical":
      return "red";
    case "high":
      return "amber";
    case "medium":
      return "blue";
    case "low":
      return "green";
    default:
      return "blue";
  }
}

/**
 * Get color for sentiment values
 */
export function getSentimentColor(
  sentiment: string
): ThresholdColor {
  switch (sentiment) {
    case "satisfied":
    case "positive":
      return "green";
    case "neutral":
    case "mixed":
      return "blue";
    case "confused":
    case "negative":
      return "amber";
    case "frustrated":
    case "urgent":
      return "red";
    default:
      return "blue";
  }
}
