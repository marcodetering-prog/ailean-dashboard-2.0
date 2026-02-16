// ============================================================
// Shared query builder for all dashboard queries
// All queries start from v_dashboard_base (the standard JOIN view)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "@/lib/types/api";

/**
 * The base view name — a Postgres VIEW that JOINs
 * tenant_inquiry_ai_analysis + tenant_inquiry_events
 * with analysis_version >= 18 baked in.
 */
export const BASE_VIEW = "v_dashboard_base";

/**
 * Parse dashboard filters from URL search params
 */
export function parseFilters(searchParams: URLSearchParams): DashboardFilters {
  const dateFrom = searchParams.get("dateFrom") || searchParams.get("from");
  const dateTo = searchParams.get("dateTo") || searchParams.get("to");
  const brand = searchParams.get("brand");

  return {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    brand: brand === "all" ? undefined : (brand as DashboardFilters["brand"]),
  };
}

/**
 * Apply dashboard filters to a Supabase query builder.
 * Filters by date range (started_at) and brand.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters(
  query: any,
  filters: DashboardFilters
) {
  let q = query;

  if (filters.dateFrom) {
    q = q.gte("started_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    // Add time to include the entire day
    q = q.lte("started_at", `${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.brand && filters.brand !== "all") {
    q = q.eq("brand", filters.brand);
  }

  return q;
}

/**
 * Create a filtered query on v_dashboard_base.
 * Returns a supabase query builder with filters already applied.
 */
export function createBaseQuery(
  supabase: SupabaseClient,
  filters: DashboardFilters,
  select: string = "*"
) {
  let query = supabase.from(BASE_VIEW).select(select);

  if (filters.dateFrom) {
    query = query.gte("started_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("started_at", `${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.brand && filters.brand !== "all") {
    query = query.eq("brand", filters.brand);
  }

  return query;
}

/**
 * Execute a raw SQL query via Supabase RPC.
 * Used for complex aggregate queries that can't be expressed with the query builder.
 */
export async function executeRawSQL(
  supabase: SupabaseClient,
  sql: string
) {
  const { data, error } = await supabase.rpc("execute_sql", { query: sql });
  if (error) throw error;
  return data;
}

/**
 * Build a WHERE clause for date and brand filters (for raw SQL queries).
 */
export function buildWhereClause(filters: DashboardFilters): string {
  const conditions: string[] = [];

  if (filters.dateFrom) {
    conditions.push(`started_at >= '${filters.dateFrom}'`);
  }
  if (filters.dateTo) {
    conditions.push(`started_at <= '${filters.dateTo}T23:59:59.999Z'`);
  }
  if (filters.brand && filters.brand !== "all") {
    conditions.push(`brand = '${filters.brand}'`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

/**
 * Helper to compute a percentage from two numbers, avoiding division by zero
 */
export function safePercent(
  numerator: number,
  denominator: number,
  decimals: number = 1
): number {
  if (denominator === 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(decimals));
}

/**
 * Helper to compute a safe average
 */
export function safeAvg(
  sum: number,
  count: number,
  decimals: number = 1
): number {
  if (count === 0) return 0;
  return Number((sum / count).toFixed(decimals));
}

/**
 * Convert an array of rows with a groupBy column into a BreakdownItem array
 */
export function toBreakdown(
  rows: Array<{ label: string; count: number }>,
  total: number
): Array<{ label: string; count: number; percentage: number }> {
  return rows.map((row) => ({
    label: row.label,
    count: row.count,
    percentage: safePercent(row.count, total),
  }));
}
