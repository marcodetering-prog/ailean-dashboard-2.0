// ============================================================
// /api/roi — ROI / cost comparison calculation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
} from "@/lib/queries/base";
import type { ROICalculation } from "@/lib/types/api";

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

// Default cost assumptions (EUR) — overridden by ailean_pricing if available
const DEFAULT_MANUAL_COST_PER_INQUIRY = 15;
const DEFAULT_AILEAN_COST_PER_INQUIRY = 2;

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  // 1. Fetch dashboard base data
  const { data, error } = await createBaseQuery(supabase, filters);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  // 2. Try to fetch pricing parameters from ailean_pricing
  let manualCost = DEFAULT_MANUAL_COST_PER_INQUIRY;
  let aileanCost = DEFAULT_AILEAN_COST_PER_INQUIRY;

  const { data: pricingData } = await supabase
    .from("ailean_pricing")
    .select("*")
    .limit(1)
    .maybeSingle();

  const pricing = pricingData as Row | null;
  if (pricing) {
    manualCost =
      pricing.manual_cost_per_inquiry ?? DEFAULT_MANUAL_COST_PER_INQUIRY;
    aileanCost =
      pricing.ailean_cost_per_inquiry ?? DEFAULT_AILEAN_COST_PER_INQUIRY;
  }

  // 3. Group by category for breakdown
  const totalInquiries = rows.length;
  const categoryMap = groupBy(
    rows,
    (r) => r.inquiry_type || r.deficiency_category
  );

  const categoryBreakdown = Array.from(categoryMap.entries()).map(
    ([category, count]) => ({
      category,
      count,
      manualCost: Number((count * manualCost).toFixed(2)),
      aileanCost: Number((count * aileanCost).toFixed(2)),
      savings: Number((count * (manualCost - aileanCost)).toFixed(2)),
    })
  );

  // 4. Compute totals
  const kostenOhneAilean = Number((totalInquiries * manualCost).toFixed(2));
  const kostenMitAilean = Number((totalInquiries * aileanCost).toFixed(2));
  const ersparnis = Number((kostenOhneAilean - kostenMitAilean).toFixed(2));
  const savingsPercentage = safePercent(ersparnis, kostenOhneAilean);

  // Estimate total units from unique tenant/conversation count
  const uniqueTenants = new Set(rows.map((r) => r.conversation_id as string));
  const totalUnits = uniqueTenants.size;

  const response: ROICalculation = {
    totalUnits,
    totalInquiries,
    categoryBreakdown,
    kostenOhneAilean,
    kostenMitAilean,
    ersparnis,
    savingsPercentage,
  };

  return NextResponse.json(response);
}
