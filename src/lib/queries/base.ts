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
 * Create a filtered query on v_dashboard_base and fetch ALL rows.
 *
 * Supabase JS defaults to returning at most 1,000 rows per request.
 * This helper paginates transparently so callers always get the
 * complete result set.
 */
export async function createBaseQuery(
  supabase: SupabaseClient,
  filters: DashboardFilters,
  select: string = "*"
): Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> {
  const PAGE_SIZE = 1000;
  let allRows: Record<string, unknown>[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase
      .from(BASE_VIEW)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (filters.dateFrom) {
      query = query.gte("started_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("started_at", `${filters.dateTo}T23:59:59.999Z`);
    }
    if (filters.brand && filters.brand !== "all") {
      query = query.eq("brand", filters.brand);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    allRows = allRows.concat(rows);

    // If we got fewer rows than the page size, we've reached the end
    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return { data: allRows, error: null };
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

/**
 * Fetch all rows from any Supabase table with pagination.
 * Used for azure_* tables and tenant_* tables that aren't in the base view.
 */
export async function fetchAllFromTable(
  supabase: SupabaseClient,
  table: string,
  select: string = "*",
  filters?: Record<string, unknown>
): Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> {
  const PAGE_SIZE = 1000;
  let allRows: Record<string, unknown>[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    allRows = allRows.concat(rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return { data: allRows, error: null };
}

/**
 * Deficiency type bitmask decoder
 */
export const DEFICIENCY_TYPE_MAP: Record<number, string> = {
  1: "Handwerker",
  2: "Sanitaer",
  4: "Geraete",
  8: "Boden",
  16: "Schluessel",
  32: "Fenster",
  64: "Elektrik",
  128: "Maler",
  256: "Schaedlinge",
  512: "Garage",
  1024: "Aufzug",
  2048: "Heizung/Lueftung",
  4096: "Abwasser",
  8192: "Notfall",
  16384: "Rolllaeden",
};

/**
 * Decode a deficiency_types bitmask into an array of category names
 */
export function decodeDeficiencyTypes(bitmask: number): string[] {
  const types: string[] = [];
  for (const [bit, name] of Object.entries(DEFICIENCY_TYPE_MAP)) {
    if (bitmask & Number(bit)) {
      types.push(name);
    }
  }
  return types.length > 0 ? types : ["Unbekannt"];
}
