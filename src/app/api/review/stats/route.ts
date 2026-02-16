// ============================================================
// /api/review/stats — Review statistics + correction data
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
} from "@/lib/queries/base";
import type { ReviewStatsResponse, BreakdownItem } from "@/lib/types/api";

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

  // 1. Fetch v_dashboard_base for review status counts
  const { data, error } = await createBaseQuery(supabase, filters);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allRows = (data ?? []) as Row[];
  const pendingReviews = allRows.filter(
    (r) => r.review_status === "pending_review"
  ).length;
  const autoApproved = allRows.filter(
    (r) => r.review_status === "auto_approved"
  ).length;

  // 2. Fetch corrections from ai_analysis_corrections
  const { data: corrData, error: corrError } = await supabase
    .from("ai_analysis_corrections")
    .select("*");

  if (corrError) {
    return NextResponse.json({ error: corrError.message }, { status: 500 });
  }

  const correctionRows = (corrData ?? []) as Row[];
  const totalCorrections = correctionRows.length;

  // Corrections by field
  const correctionsByField = mapToBreakdown(
    groupBy(correctionRows, (r) => r.field_corrected),
    totalCorrections
  );

  // Incorporation rate: corrections with status = 'incorporated'
  const incorporatedCount = correctionRows.filter(
    (r) => r.status === "incorporated"
  ).length;
  const incorporationRate = safePercent(incorporatedCount, totalCorrections);

  const response: ReviewStatsResponse = {
    pendingReviews,
    autoApproved,
    totalCorrections,
    correctionsByField,
    incorporationRate,
  };

  return NextResponse.json(response);
}
