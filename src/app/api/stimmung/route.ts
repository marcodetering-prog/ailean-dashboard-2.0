// ============================================================
// /api/stimmung — Sentiment arcs (#33/#34) + Mail Analytics (#41)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  fetchAllFromTable,
  safePercent,
  safeAvg,
} from "@/lib/queries/base";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// Sentiment categories grouped by polarity
const POSITIVE_SENTIMENTS = ["positive", "satisfied"];
const NEGATIVE_SENTIMENTS = ["negative", "frustrated", "urgent"];

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  // Fetch tenant event data from v_dashboard_base (has sentiment per event)
  const { data, error } = await createBaseQuery(supabase, filters);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];

  // --- KPIs #33/#34: Sentiment Arcs ---
  // Group events by phone_number (tenant) sorted by time
  const tenantEvents = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.phone_number && r.tenant_sentiment) {
      const phone = String(r.phone_number);
      if (!tenantEvents.has(phone)) {
        tenantEvents.set(phone, []);
      }
      tenantEvents.get(phone)!.push(r);
    }
  }

  // Analyze sentiment transitions for tenants with multiple events
  let positiveToNegative = 0;
  let negativeToPositive = 0;
  let totalMultiEventTenants = 0;

  for (const [, events] of tenantEvents) {
    if (events.length < 2) continue;
    totalMultiEventTenants++;

    // Sort by started_at
    events.sort((a, b) => {
      const ta = new Date(a.started_at as string).getTime();
      const tb = new Date(b.started_at as string).getTime();
      return ta - tb;
    });

    const firstSentiment = String(events[0].tenant_sentiment);
    const lastSentiment = String(events[events.length - 1].tenant_sentiment);

    const firstIsPositive = POSITIVE_SENTIMENTS.includes(firstSentiment);
    const firstIsNegative = NEGATIVE_SENTIMENTS.includes(firstSentiment);
    const lastIsPositive = POSITIVE_SENTIMENTS.includes(lastSentiment);
    const lastIsNegative = NEGATIVE_SENTIMENTS.includes(lastSentiment);

    if (firstIsPositive && lastIsNegative) positiveToNegative++;
    if (firstIsNegative && lastIsPositive) negativeToPositive++;
  }

  const positiveToNegativeRate = safePercent(positiveToNegative, totalMultiEventTenants);
  const negativeToPositiveRate = safePercent(negativeToPositive, totalMultiEventTenants);

  // Detailed sentiment transition matrix
  const transitions: Record<string, Record<string, number>> = {};
  for (const [, events] of tenantEvents) {
    if (events.length < 2) continue;
    events.sort((a, b) =>
      new Date(a.started_at as string).getTime() - new Date(b.started_at as string).getTime()
    );
    for (let i = 0; i < events.length - 1; i++) {
      const from = String(events[i].tenant_sentiment);
      const to = String(events[i + 1].tenant_sentiment);
      if (!transitions[from]) transitions[from] = {};
      transitions[from][to] = (transitions[from][to] || 0) + 1;
    }
  }

  // Convert transition matrix to flat array for frontend
  const sentimentTransitions: Array<{ from: string; to: string; count: number }> = [];
  for (const [from, tos] of Object.entries(transitions)) {
    for (const [to, count] of Object.entries(tos)) {
      sentimentTransitions.push({ from, to, count });
    }
  }
  sentimentTransitions.sort((a, b) => b.count - a.count);

  // --- KPI #41: Mail Analytics ---
  // Fetch craftsmen data
  const { data: craftsmenData } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_craftsmen",
    "id, email, company, trade"
  );
  const craftsmen = (craftsmenData ?? []) as Row[];

  // Fetch deficiencies with deficiency_report and craftsman_id
  const { data: defData } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_deficiencies",
    "id, craftsman_id, deficiency_report, time_added"
  );
  const defRows = (defData ?? []) as Row[];

  // Build craftsman lookup
  const craftsmanMap = new Map(craftsmen.map((c) => [c.id, c]));

  // Count reports and craftsman assignments
  const reportsGenerated = defRows.filter(
    (d) => d.deficiency_report && String(d.deficiency_report).length > 5
  ).length;

  const withCraftsman = defRows.filter(
    (d) => d.craftsman_id && craftsmanMap.has(d.craftsman_id)
  );
  const reportsSent = withCraftsman.filter(
    (d) => d.deficiency_report && String(d.deficiency_report).length > 5
  ).length;

  const uniqueCraftsmen = new Set(
    withCraftsman.map((d) => String(d.craftsman_id))
  ).size;

  // Craftsman company breakdown
  const companyMap = new Map<string, number>();
  for (const d of withCraftsman) {
    const craftsman = craftsmanMap.get(d.craftsman_id);
    const company = craftsman?.company ? String(craftsman.company) : "Unbekannt";
    companyMap.set(company, (companyMap.get(company) || 0) + 1);
  }
  const craftsmanBreakdown = Array.from(companyMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: safePercent(count, withCraftsman.length),
    }))
    .sort((a, b) => b.count - a.count);

  // Trade breakdown
  const tradeMap = new Map<string, number>();
  for (const c of craftsmen) {
    if (c.trade) {
      const trade = String(c.trade);
      tradeMap.set(trade, (tradeMap.get(trade) || 0) + 1);
    }
  }
  const tradeBreakdown = Array.from(tradeMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: safePercent(count, craftsmen.length),
    }))
    .sort((a, b) => b.count - a.count);

  // Monthly mail volume
  const monthlyMail = new Map<string, number>();
  for (const d of withCraftsman) {
    if (d.time_added) {
      const date = new Date(d.time_added as string);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyMail.set(key, (monthlyMail.get(key) || 0) + 1);
    }
  }
  const monthlyMailVolume = Array.from(monthlyMail.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return NextResponse.json({
    // KPI #33: Positive → Negative
    positiveToNegative,
    positiveToNegativeRate,
    // KPI #34: Negative → Positive
    negativeToPositive,
    negativeToPositiveRate,
    // Shared
    totalMultiEventTenants,
    sentimentTransitions: sentimentTransitions.slice(0, 20),
    // KPI #41: Mail Analytics
    reportsGenerated,
    reportsSent,
    uniqueCraftsmen,
    totalCraftsmen: craftsmen.length,
    craftsmanBreakdown: craftsmanBreakdown.slice(0, 20),
    tradeBreakdown,
    monthlyMailVolume,
  });
}
