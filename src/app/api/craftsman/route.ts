// ============================================================
// /api/craftsman — Craftsman / deficiency pipeline metrics
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
} from "@/lib/queries/base";
import type {
  CraftsmanOverview,
  CraftsmanPipelineItem,
  CraftsmanCategoryItem,
} from "@/lib/types/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

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

  // Only rows with deficiency reports are relevant
  const deficiencyRows = rows.filter(
    (r) => r.has_deficiency_report === true
  );
  const totalJobs = deficiencyRows.length;

  // --- Completion rate ---
  const resolvedStates = [
    "resolved",
    "completed",
    "closed",
    "done",
    "fertig",
    "abgeschlossen",
  ];
  const completedCount = deficiencyRows.filter(
    (r) =>
      r.deficiency_state_label &&
      resolvedStates.some((s) =>
        String(r.deficiency_state_label).toLowerCase().includes(s)
      )
  ).length;
  const completionRate = safePercent(completedCount, totalJobs);

  // --- Self-repair stats ---
  const selfRepairCount = deficiencyRows.filter(
    (r) => r.resolution_method === "self_repaired"
  ).length;
  const selfRepairRate = safePercent(selfRepairCount, totalJobs);

  // --- Craftsman assigned rate ---
  const craftsmanAssignedCount = deficiencyRows.filter(
    (r) => r.has_craftsman === true
  ).length;
  const craftsmanAssignedRate = safePercent(craftsmanAssignedCount, totalJobs);

  const overview: CraftsmanOverview = {
    totalJobs,
    completionRate,
    selfRepairCount,
    selfRepairRate,
    craftsmanAssignedRate,
  };

  // --- Pipeline: group by deficiency_state_label ---
  const stateMap = new Map<string, { count: number; category: string }>();

  for (const row of deficiencyRows) {
    const label = row.deficiency_state_label || "unknown";
    const existing = stateMap.get(label) || {
      count: 0,
      category: row.deficiency_state_category || "unknown",
    };
    existing.count += 1;
    stateMap.set(label, existing);
  }

  const pipeline: CraftsmanPipelineItem[] = Array.from(stateMap.entries())
    .map(([stateLabel, d]) => ({
      stateLabel,
      stateCategory: d.category,
      count: d.count,
    }))
    .sort((a, b) => b.count - a.count);

  // --- Categories: group by deficiency_category with cost aggregation ---
  const categoryMap = new Map<string, { count: number; totalCost: number }>();

  for (const row of deficiencyRows) {
    const category = row.deficiency_category || "unknown";
    const existing = categoryMap.get(category) || {
      count: 0,
      totalCost: 0,
    };
    existing.count += 1;
    if (row.deficiency_total_cost != null) {
      existing.totalCost += Number(row.deficiency_total_cost);
    }
    categoryMap.set(category, existing);
  }

  const categories: CraftsmanCategoryItem[] = Array.from(
    categoryMap.entries()
  )
    .map(([category, d]) => ({
      category: category as CraftsmanCategoryItem["category"],
      count: d.count,
      totalCost: Number(d.totalCost.toFixed(2)),
      avgCost:
        d.count > 0 ? Number((d.totalCost / d.count).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ overview, pipeline, categories });
}
