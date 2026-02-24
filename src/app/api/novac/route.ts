// ============================================================
// /api/novac — NOVAC Review KPIs (#1-10)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
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

  // Force NOVAC filter for azure queries
  const novacFilters = { ...filters, brand: "novac" as const };

  // Fetch azure tables
  const [accResult, condResult, propResult, defResult] = await Promise.all([
    fetchAllFromTable(supabase, "azure_accommodations", "id, name, brand"),
    fetchAllFromTable(supabase, "azure_real_estate_condominia", "id, accommodation_id, address, property_owner"),
    fetchAllFromTable(supabase, "azure_real_estate_properties", "id, real_estate_condominium_id"),
    fetchAllFromTable(supabase, "azure_real_estate_deficiencies", "id, real_estate_property_id, deficiency_types, deficiency_state, time_added, next_follow_up, tenant_name, tenant_phone_number"),
  ]);

  if (accResult.error) return NextResponse.json({ error: accResult.error.message }, { status: 500 });
  if (condResult.error) return NextResponse.json({ error: condResult.error.message }, { status: 500 });
  if (propResult.error) return NextResponse.json({ error: propResult.error.message }, { status: 500 });
  if (defResult.error) return NextResponse.json({ error: defResult.error.message }, { status: 500 });

  const accRows = (accResult.data ?? []) as Row[];
  const condRows = (condResult.data ?? []) as Row[];
  const propRows = (propResult.data ?? []) as Row[];
  const defRows = (defResult.data ?? []) as Row[];

  // Build lookups
  const accMap = new Map(accRows.map((a) => [a.id, a]));
  const condMap = new Map(condRows.map((c) => [c.id, c]));
  const propMap = new Map(propRows.map((p) => [p.id, p]));

  // Enrich and filter NOVAC deficiencies only
  const enriched: Row[] = defRows
    .map((d) => {
      const prop = propMap.get(d.real_estate_property_id) as Row | undefined;
      const cond = prop ? condMap.get(prop.real_estate_condominium_id) as Row | undefined : undefined;
      const acc = cond ? accMap.get(cond.accommodation_id) as Row | undefined : undefined;
      return {
        ...d,
        brand: acc?.brand || acc?.name || "unknown",
        building_address: cond?.address || "unknown",
      } as Row;
    })
    .filter((d) => String(d.brand).toLowerCase().includes("novac"))
    .filter((d) => {
      if (!d.time_added) return false;
      const added = new Date(d.time_added as string);
      if (novacFilters.dateFrom && added < new Date(novacFilters.dateFrom)) return false;
      if (novacFilters.dateTo && added > new Date(`${novacFilters.dateTo}T23:59:59.999Z`)) return false;
      return true;
    });

  const total = enriched.length;

  // --- NOVAC #1: Total tickets sent ---
  const totalTickets = total;

  // --- NOVAC #2: 1st Escalation (states 6, 9, 12) ---
  const firstEscalation = enriched.filter((d) =>
    [6, 9, 12].includes(Number(d.deficiency_state))
  ).length;

  // --- NOVAC #3: 2nd Escalation (states 11, 13, 14) ---
  const secondEscalation = enriched.filter((d) =>
    [11, 13, 14].includes(Number(d.deficiency_state))
  ).length;

  // --- NOVAC #4: Topic distribution ---
  const topicMap = new Map<string, number>();
  for (const d of enriched) {
    const types = decodeDeficiencyTypes(Number(d.deficiency_types) || 0);
    for (const t of types) {
      topicMap.set(t, (topicMap.get(t) || 0) + 1);
    }
  }
  const topicBreakdown = Array.from(topicMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: safePercent(count, total),
    }))
    .sort((a, b) => b.count - a.count);

  // --- NOVAC #5: Per building ---
  const buildingMap = new Map<string, { count: number; escalated: number }>();
  for (const d of enriched) {
    const addr = String(d.building_address);
    const existing = buildingMap.get(addr) || { count: 0, escalated: 0 };
    existing.count++;
    if ([6, 9, 11, 12, 13, 14].includes(Number(d.deficiency_state))) {
      existing.escalated++;
    }
    buildingMap.set(addr, existing);
  }
  const buildingBreakdown = Array.from(buildingMap.entries())
    .map(([address, data]) => ({
      address,
      count: data.count,
      escalated: data.escalated,
      escalationRate: safePercent(data.escalated, data.count),
    }))
    .sort((a, b) => b.count - a.count);

  // --- NOVAC #6: Average processing time ---
  const closingStates = [9, 13, 15];
  const closingTimes = enriched
    .filter((d) => {
      if (!closingStates.includes(Number(d.deficiency_state))) return false;
      const followUp = new Date(d.next_follow_up as string);
      return followUp.getFullYear() > 2000;
    })
    .map((d) => {
      const added = new Date(d.time_added as string);
      const followUp = new Date(d.next_follow_up as string);
      return Math.max(0, (followUp.getTime() - added.getTime()) / (1000 * 60 * 60 * 24));
    });

  const avgProcessingDays =
    closingTimes.length > 0
      ? safeAvg(closingTimes.reduce((s, d) => s + d, 0), closingTimes.length, 1)
      : 0;

  // --- NOVAC #7: Bugs reported (from tenant tables) ---
  const { data: bugData } = await createBaseQuery(supabase, novacFilters);
  const tenantRows = (bugData ?? []) as Row[];
  const bugCount = tenantRows.filter((r) => r.is_bug === true).length;
  const bugRate = safePercent(bugCount, tenantRows.length);

  // Bug category breakdown
  const bugCatMap = new Map<string, number>();
  for (const r of tenantRows) {
    if (r.is_bug === true && r.bug_category) {
      const cat = String(r.bug_category);
      bugCatMap.set(cat, (bugCatMap.get(cat) || 0) + 1);
    }
  }
  const bugCategoryBreakdown = Array.from(bugCatMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: safePercent(count, bugCount),
    }))
    .sort((a, b) => b.count - a.count);

  // --- NOVAC #9: External vs Head escalation ratio ---
  const escalationRatio =
    secondEscalation > 0
      ? Number((firstEscalation / secondEscalation).toFixed(2))
      : firstEscalation > 0
      ? Infinity
      : 0;

  // --- NOVAC #10: AILEAN tickets vs total events ---
  const totalEvents = tenantRows.length;
  const conversionRate = safePercent(total, totalEvents);

  return NextResponse.json({
    totalTickets,
    firstEscalation,
    secondEscalation,
    topicBreakdown,
    buildingBreakdown,
    avgProcessingDays,
    bugCount,
    bugRate,
    bugCategoryBreakdown,
    escalationRatio,
    totalEvents,
    conversionRate,
  });
}
