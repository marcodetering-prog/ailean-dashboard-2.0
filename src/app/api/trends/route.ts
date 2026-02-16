// ============================================================
// /api/trends — Time-series data grouped by ISO week
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
  safeAvg,
} from "@/lib/queries/base";
import type { TrendDataPoint } from "@/lib/types/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

interface WeekBucket {
  count: number;
  qualitySum: number;
  qualityCount: number;
  loopCount: number;
  bugCount: number;
  automationSum: number;
  automationCount: number;
  deficiencyReportCount: number;
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

  // --- Group by ISO week ---
  const weekMap = new Map<string, WeekBucket>();

  for (const row of rows) {
    if (!row.started_at) continue;
    const week = getISOWeek(row.started_at);

    const bucket = weekMap.get(week) || {
      count: 0,
      qualitySum: 0,
      qualityCount: 0,
      loopCount: 0,
      bugCount: 0,
      automationSum: 0,
      automationCount: 0,
      deficiencyReportCount: 0,
    };

    bucket.count += 1;

    if (row.ai_quality_score != null) {
      bucket.qualitySum += Number(row.ai_quality_score);
      bucket.qualityCount += 1;
    }
    if (row.ai_loop_detected === true) {
      bucket.loopCount += 1;
    }
    if (row.is_bug === true) {
      bucket.bugCount += 1;
    }
    if (row.automation_rate != null) {
      bucket.automationSum += Number(row.automation_rate);
      bucket.automationCount += 1;
    }
    if (row.has_deficiency_report === true) {
      bucket.deficiencyReportCount += 1;
    }

    weekMap.set(week, bucket);
  }

  // --- Build trend data points ---
  const trends: TrendDataPoint[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, b]) => ({
      period,
      count: b.count,
      avgQuality: safeAvg(b.qualitySum, b.qualityCount, 2),
      loopRate: safePercent(b.loopCount, b.count),
      bugRate: safePercent(b.bugCount, b.count),
      automationRate: safeAvg(b.automationSum, b.automationCount, 1),
      deficiencyReportRate: safePercent(b.deficiencyReportCount, b.count),
    }));

  return NextResponse.json({ trends });
}
