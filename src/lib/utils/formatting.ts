// ============================================================
// Formatting utilities for numbers, dates, and currencies
// Uses German locale conventions
// ============================================================

/**
 * Format a number with German locale (1.234,56)
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString("de-CH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage value (0.85 -> "85.0%")
 */
export function formatPercent(
  value: number,
  decimals: number = 1
): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a percentage that's already in 0-100 range
 */
export function formatPercentRaw(
  value: number,
  decimals: number = 1
): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format seconds into a human-readable duration
 * 45 -> "45s", 125 -> "2m 5s", 3661 -> "1h 1m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const min = Math.round((seconds % 3600) / 60);
  return min > 0 ? `${hours}h ${min}m` : `${hours}h`;
}

/**
 * Format minutes into a human-readable duration
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} Min.`;
  }
  const hours = Math.floor(minutes / 60);
  const min = Math.round(minutes % 60);
  return min > 0 ? `${hours}h ${min}m` : `${hours}h`;
}

/**
 * Format currency in CHF (Swiss Francs)
 */
export function formatCHF(value: number, decimals: number = 2): string {
  return `CHF ${value.toLocaleString("de-CH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format an ISO date string to German locale
 * "2026-02-14" -> "14. Feb. 2026"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format an ISO date string to short format
 * "2026-02-14" -> "14.02.26"
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * Format an ISO date string with time
 * "2026-02-14T10:30:00Z" -> "14. Feb. 2026, 10:30"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a week period label
 * "2026-02-10" -> "KW 7 / 2026"
 */
export function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `KW ${weekNumber} / ${date.getFullYear()}`;
}

/**
 * Format a month period label
 * "2026-02-01" -> "Feb 2026"
 */
export function formatMonthLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-CH", {
    month: "short",
    year: "numeric",
  });
}

/**
 * Compact large numbers (1234 -> "1.2K")
 */
export function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}
