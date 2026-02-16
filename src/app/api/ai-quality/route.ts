// ============================================================
// /api/ai-quality — AI quality metrics & trends
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
  safeAvg,
} from "@/lib/queries/base";
import type {
  AIQualityResponse,
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

  // --- Average quality score ---
  const qualityRows = rows.filter((r) => r.ai_quality_score != null);
  const qualitySum = qualityRows.reduce(
    (s, r) => s + Number(r.ai_quality_score),
    0
  );
  const avgQualityScore = safeAvg(qualitySum, qualityRows.length, 2);

  // --- Quality score distribution (1-5 histogram) ---
  const qualityScoreDistribution = mapToBreakdown(
    groupBy(rows, (r) =>
      r.ai_quality_score != null
        ? String(Math.round(Number(r.ai_quality_score)))
        : null
    ),
    total
  );

  // --- Loop detection ---
  const loopCount = rows.filter((r) => r.ai_loop_detected === true).length;
  const loopRate = safePercent(loopCount, total);

  // --- Misunderstanding ---
  const misunderstandingCount = rows.filter(
    (r) => r.ai_misunderstood === true
  ).length;
  const misunderstandingRate = safePercent(misunderstandingCount, total);

  // --- Correct triage ---
  const correctTriageCount = rows.filter(
    (r) => r.ai_correct_triage === true
  ).length;
  const correctTriageRate = safePercent(correctTriageCount, total);

  // --- Unnecessary questions ---
  const uqRows = rows.filter((r) => r.ai_unnecessary_questions != null);
  const uqSum = uqRows.reduce(
    (s, r) => s + Number(r.ai_unnecessary_questions),
    0
  );
  const avgUnnecessaryQuestions = safeAvg(uqSum, uqRows.length, 2);

  // --- Sentiment breakdown ---
  const sentimentBreakdown = mapToBreakdown(
    groupBy(rows, (r) => r.tenant_sentiment),
    total
  );

  // --- Resolution breakdown ---
  const resolutionBreakdown = mapToBreakdown(
    groupBy(rows, (r) => r.resolution_method),
    total
  );

  // --- Quality trend (by ISO week) ---
  const weekMap = new Map<string, { totalScore: number; count: number }>();

  for (const row of rows) {
    if (!row.started_at) continue;
    const week = getISOWeek(row.started_at);
    const existing = weekMap.get(week) || { totalScore: 0, count: 0 };
    if (row.ai_quality_score != null) {
      existing.totalScore += Number(row.ai_quality_score);
      existing.count += 1;
    }
    weekMap.set(week, existing);
  }

  const qualityTrend: TimeSeriesPoint[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, d]) => ({
      period,
      value: safeAvg(d.totalScore, d.count, 2),
    }));

  const response: AIQualityResponse = {
    avgQualityScore,
    qualityScoreDistribution,
    loopRate,
    loopCount,
    misunderstandingRate,
    misunderstandingCount,
    correctTriageRate,
    avgUnnecessaryQuestions,
    sentimentBreakdown,
    resolutionBreakdown,
    qualityTrend,
  };

  return NextResponse.json(response);
}
