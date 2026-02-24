// ============================================================
// /api/deficiency — Deficiency analysis KPIs (#18-24, #35)
// Queries azure tables for deficiency data
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  fetchAllFromTable,
  safePercent,
  safeAvg,
  decodeDeficiencyTypes,
} from "@/lib/queries/base";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  // 1. Fetch accommodations to map brand
  const { data: accommodations, error: accError } = await fetchAllFromTable(
    supabase,
    "azure_accommodations",
    "id, name, brand"
  );
  if (accError) {
    return NextResponse.json({ error: accError.message }, { status: 500 });
  }

  // 2. Fetch condominia (buildings)
  const { data: condominia, error: condError } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_condominia",
    "id, accommodation_id, address, property_owner"
  );
  if (condError) {
    return NextResponse.json({ error: condError.message }, { status: 500 });
  }

  // 3. Fetch properties (units)
  const { data: properties, error: propError } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_properties",
    "id, real_estate_condominium_id, apartment_number"
  );
  if (propError) {
    return NextResponse.json({ error: propError.message }, { status: 500 });
  }

  // 4. Fetch deficiencies
  const { data: deficiencies, error: defError } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_deficiencies",
    "id, real_estate_property_id, deficiency_types, deficiency_state, time_added, next_follow_up, tenant_name, tenant_phone_number"
  );
  if (defError) {
    return NextResponse.json({ error: defError.message }, { status: 500 });
  }

  const accRows = (accommodations ?? []) as Row[];
  const condRows = (condominia ?? []) as Row[];
  const propRows = (properties ?? []) as Row[];
  const defRows = (deficiencies ?? []) as Row[];

  // Build lookup maps
  const accMap = new Map(accRows.map((a) => [a.id, a]));
  const condMap = new Map(condRows.map((c) => [c.id, c]));
  const propMap = new Map(propRows.map((p) => [p.id, p]));

  // Enrich deficiencies with brand info
  const enriched: Row[] = defRows
    .map((d) => {
      const prop = propMap.get(d.real_estate_property_id) as Row | undefined;
      const cond = prop ? condMap.get(prop.real_estate_condominium_id) as Row | undefined : undefined;
      const acc = cond ? accMap.get(cond.accommodation_id) as Row | undefined : undefined;
      return {
        ...d,
        brand: acc?.brand || acc?.name || "unknown",
        building_address: cond?.address || "unknown",
        property_owner: cond?.property_owner || null,
        apartment_number: prop?.apartment_number || null,
      } as Row;
    })
    .filter((d) => {
      // Apply brand filter
      if (filters.brand && filters.brand !== "all") {
        const brandLower = String(d.brand).toLowerCase();
        return brandLower.includes(filters.brand.toLowerCase());
      }
      return true;
    })
    .filter((d) => {
      // Apply date filter
      if (!d.time_added) return false;
      const added = new Date(d.time_added as string);
      if (filters.dateFrom && added < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && added > new Date(`${filters.dateTo}T23:59:59.999Z`))
        return false;
      return true;
    });

  const total = enriched.length;

  // --- KPI #18: Deficiencies per category (bitmask decode) ---
  const categoryCount = new Map<string, number>();
  for (const d of enriched) {
    const types = decodeDeficiencyTypes(Number(d.deficiency_types) || 0);
    for (const t of types) {
      categoryCount.set(t, (categoryCount.get(t) || 0) + 1);
    }
  }
  const categoryBreakdown = Array.from(categoryCount.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: safePercent(count, total),
    }))
    .sort((a, b) => b.count - a.count);

  // --- KPI #20: % Solved with AILEAN ---
  // MD guide query: IN (4, 9, 13). State 15 (Cancelled/Storniert) does NOT count as solved.
  const terminalStates = [4, 9, 13];
  const solvedCount = enriched.filter((d) =>
    terminalStates.includes(Number(d.deficiency_state))
  ).length;
  const solvedPercent = safePercent(solvedCount, total);

  // --- KPIs #21-24: Time period analysis ---
  const monthlyCount = new Map<string, number>();
  const quarterlyCount = new Map<string, number>();
  const yearlyCount = new Map<string, number>();

  for (const d of enriched) {
    const date = new Date(d.time_added as string);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const quarterKey = `${date.getFullYear()}-Q${quarter}`;
    const yearKey = String(date.getFullYear());

    monthlyCount.set(monthKey, (monthlyCount.get(monthKey) || 0) + 1);
    quarterlyCount.set(quarterKey, (quarterlyCount.get(quarterKey) || 0) + 1);
    yearlyCount.set(yearKey, (yearlyCount.get(yearKey) || 0) + 1);
  }

  const monthlyTrend = Array.from(monthlyCount.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const quarterlyTrend = Array.from(quarterlyCount.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const yearlyTrend = Array.from(yearlyCount.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // --- KPI #35: Deficiency closing time ---
  const closingTimeStates = [9, 13, 15]; // terminal states with valid follow-up
  const closingTimeData = enriched
    .filter((d) => {
      if (!closingTimeStates.includes(Number(d.deficiency_state))) return false;
      const followUp = new Date(d.next_follow_up as string);
      return followUp.getFullYear() > 2000; // filter out 0001-01-01
    })
    .map((d) => {
      const added = new Date(d.time_added as string);
      const followUp = new Date(d.next_follow_up as string);
      const days = (followUp.getTime() - added.getTime()) / (1000 * 60 * 60 * 24);
      return {
        state: Number(d.deficiency_state),
        days: Math.max(0, days),
      };
    });

  // Group by state for avg closing time
  const closingByState = new Map<number, number[]>();
  for (const item of closingTimeData) {
    if (!closingByState.has(item.state)) {
      closingByState.set(item.state, []);
    }
    closingByState.get(item.state)!.push(item.days);
  }

  const stateNames: Record<number, string> = {
    9: "Reparatur abgeschlossen",
    13: "Mieter bestaetigt",
    15: "Storniert",
  };

  const closingTimeSummary = Array.from(closingByState.entries()).map(
    ([state, days]) => ({
      state,
      stateLabel: stateNames[state] || `Status ${state}`,
      count: days.length,
      avgDays: safeAvg(
        days.reduce((s, d) => s + d, 0),
        days.length,
        1
      ),
      minDays: Number(Math.min(...days).toFixed(1)),
      maxDays: Number(Math.max(...days).toFixed(1)),
    })
  );

  const allClosingDays = closingTimeData.map((d) => d.days);
  const overallAvgClosingDays =
    allClosingDays.length > 0
      ? safeAvg(
          allClosingDays.reduce((s, d) => s + d, 0),
          allClosingDays.length,
          1
        )
      : 0;

  // --- State distribution ---
  const stateCount = new Map<number, number>();
  for (const d of enriched) {
    const state = Number(d.deficiency_state);
    stateCount.set(state, (stateCount.get(state) || 0) + 1);
  }

  const stateLabels: Record<number, string> = {
    0: "Gemeldet",
    1: "Handwerker zugewiesen",
    2: "Termin geplant",
    4: "Warten auf Antwort",
    6: "Zurueckgestellt",
    7: "An Handwerker gesendet",
    9: "Reparatur abgeschlossen",
    10: "Rechnung eingereicht",
    11: "Rechnung bestritten",
    12: "Kosten genehmigt",
    13: "Mieter bestaetigt",
    14: "Wiederoeffnet",
    15: "Storniert",
    16: "Mit Firmenhilfe abgeschlossen",
  };

  const stateBreakdown = Array.from(stateCount.entries())
    .map(([state, count]) => ({
      label: stateLabels[state] || `Status ${state}`,
      count,
      percentage: safePercent(count, total),
      stateId: state,
    }))
    .sort((a, b) => a.stateId - b.stateId);

  return NextResponse.json({
    totalDeficiencies: total,
    solvedCount,
    solvedPercent,
    categoryBreakdown,
    monthlyTrend,
    quarterlyTrend,
    yearlyTrend,
    closingTimeSummary,
    overallAvgClosingDays,
    stateBreakdown,
  });
}
