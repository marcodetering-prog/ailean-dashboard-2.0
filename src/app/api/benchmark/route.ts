// ============================================================
// /api/benchmark — Cross-brand benchmarking
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
  safeAvg,
} from "@/lib/queries/base";
import type { BenchmarkData, BreakdownItem } from "@/lib/types/api";

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

function avgField(rows: Row[], field: string): number {
  const valid = rows.filter((r) => r[field] != null);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((s, r) => s + Number(r[field]), 0);
  return safeAvg(sum, valid.length, 2);
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  // Fetch all rows (ignore brand filter for benchmarking — we want all brands)
  const filtersWithoutBrand = { ...filters, brand: undefined };
  const { data, error } = await createBaseQuery(
    supabase,
    filtersWithoutBrand
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  // --- Group rows by brand ---
  const brandMap = new Map<string, Row[]>();
  for (const row of rows) {
    const brand = row.brand || "unknown";
    const existing = brandMap.get(brand) || [];
    existing.push(row);
    brandMap.set(brand, existing);
  }

  // --- Compute KPIs for each brand ---
  const benchmarks: BenchmarkData[] = Array.from(brandMap.entries()).map(
    ([brand, brandRows]) => {
      const total = brandRows.length;

      const loopCount = brandRows.filter(
        (r) => r.ai_loop_detected === true
      ).length;
      const bugCount = brandRows.filter(
        (r) => r.is_bug === true
      ).length;
      const defReportCount = brandRows.filter(
        (r) => r.has_deficiency_report === true
      ).length;

      return {
        brand: brand as BenchmarkData["brand"],
        totalEvents: total,
        avgQualityScore: avgField(brandRows, "ai_quality_score"),
        automationRate: avgField(brandRows, "automation_rate"),
        loopRate: safePercent(loopCount, total),
        bugRate: safePercent(bugCount, total),
        avgFirstResponseSec: avgField(brandRows, "first_response_sec"),
        avgDurationMin: avgField(brandRows, "duration_minutes"),
        deficiencyReportRate: safePercent(defReportCount, total),
        sentimentBreakdown: mapToBreakdown(
          groupBy(brandRows, (r) => r.tenant_sentiment),
          total
        ),
      };
    }
  );

  // Sort by total events descending
  benchmarks.sort((a, b) => b.totalEvents - a.totalEvents);

  return NextResponse.json({ benchmarks });
}
