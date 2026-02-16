// ============================================================
// /api/bugs/summary — Bug statistics from v_dashboard_base
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
} from "@/lib/queries/base";
import type {
  BugSummaryResponse,
  BreakdownItem,
  TimeSeriesPoint,
} from "@/lib/types/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupBy(
  items: Row[],
  key: (item: Row) => string | null | undefined
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item) || "unknown";
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

function mapToBreakdown(
  map: Map<string, number>,
  total: number
): BreakdownItem[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: safePercent(count, total),
    }))
    .sort((a, b) => b.count - a.count);
}

function getISOWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  const { data, error } = await createBaseQuery(supabase, filters);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  const total = rows.length;
  const bugRows = rows.filter((r) => r.is_bug === true);
  const totalBugs = bugRows.length;
  const bugRate = safePercent(totalBugs, total);

  // --- Category breakdown (among bugs only) ---
  const categoryBreakdown = mapToBreakdown(
    groupBy(bugRows, (r) => r.bug_category),
    totalBugs
  );

  // --- Reproducibility breakdown (among bugs only) ---
  const reproducibilityBreakdown = mapToBreakdown(
    groupBy(bugRows, (r) => r.reproducible),
    totalBugs
  );

  // --- Status breakdown (among bugs only) ---
  const statusBreakdown = mapToBreakdown(
    groupBy(bugRows, (r) => r.review_status),
    totalBugs
  );

  // --- Unreviewed count ---
  const unreviewedCount = bugRows.filter(
    (r) => r.bug_reviewed_at == null
  ).length;

  // --- Bug trend by ISO week ---
  const weekMap = new Map<string, number>();
  for (const row of bugRows) {
    if (!row.started_at) continue;
    const week = getISOWeek(row.started_at);
    weekMap.set(week, (weekMap.get(week) || 0) + 1);
  }

  const bugTrend: TimeSeriesPoint[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }));

  const response: BugSummaryResponse = {
    totalBugs,
    bugRate,
    categoryBreakdown,
    statusBreakdown,
    unreviewedCount,
    bugTrend,
    reproducibilityBreakdown,
  };

  return NextResponse.json(response);
}
