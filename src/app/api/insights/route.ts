// ============================================================
// /api/insights — Business hour patterns & peak analysis
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
} from "@/lib/queries/base";
import type { InsightsPatternsResponse, BreakdownItem } from "@/lib/types/api";

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

  // --- Business hours split ---
  const insideHoursCount = rows.filter(
    (r) => r.is_inside_hours === true
  ).length;
  const outsideHoursCount = rows.filter(
    (r) => r.is_inside_hours === false
  ).length;
  const insideHoursRate = safePercent(insideHoursCount, total);

  // --- Day of week breakdown ---
  const dowMap = groupBy(rows, (r) =>
    r.started_dow != null ? String(r.started_dow) : null
  );
  const dayOfWeekBreakdown = mapToBreakdown(dowMap, total);

  // --- Hour of day breakdown ---
  const hourMap = groupBy(rows, (r) =>
    r.started_hour_cet != null ? String(r.started_hour_cet) : null
  );
  const hourOfDayBreakdown = mapToBreakdown(hourMap, total);

  // --- Peak day (day with highest count) ---
  let peakDay = "unknown";
  let peakDayCount = 0;
  for (const [day, count] of dowMap.entries()) {
    if (count > peakDayCount) {
      peakDayCount = count;
      peakDay = day;
    }
  }

  // --- Peak hour ---
  let peakHour = 0;
  let peakHourCount = 0;
  for (const [hour, count] of hourMap.entries()) {
    if (count > peakHourCount) {
      peakHourCount = count;
      peakHour = Number(hour) || 0;
    }
  }

  const response: InsightsPatternsResponse = {
    insideHoursCount,
    outsideHoursCount,
    insideHoursRate,
    peakDay,
    peakHour,
    dayOfWeekBreakdown,
    hourOfDayBreakdown,
  };

  return NextResponse.json(response);
}
