// ============================================================
// /api/ai-perf — AI Performance KPIs (ADD-5 to ADD-17)
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

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  // Fetch v_dashboard_base for tenant inquiry data
  const { data, error } = await createBaseQuery(supabase, filters);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const total = rows.length;

  if (total === 0) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  // --- ADD-5: Avg Response Time ---
  const responseTimeRows = rows.filter(
    (r) => r.first_response_sec != null && Number(r.first_response_sec) > 0
  );
  const avgFirstResponseSec =
    responseTimeRows.length > 0
      ? safeAvg(
          responseTimeRows.reduce((s, r) => s + Number(r.first_response_sec), 0),
          responseTimeRows.length,
          1
        )
      : 0;

  // Median first response
  const sortedResponseTimes = responseTimeRows
    .map((r) => Number(r.first_response_sec))
    .filter((v) => v > 0 && v < 120)
    .sort((a, b) => a - b);
  const medianFirstResponseSec =
    sortedResponseTimes.length > 0
      ? sortedResponseTimes[Math.floor(sortedResponseTimes.length / 2)]
      : 0;

  // --- ADD-6: SLA Compliance (Deficiency reports ONLY per MD guide) ---
  // Source: azure_real_estate_company_configurations (thresholds) + deficiency timestamps
  // SLA thresholds from MD:
  //   PH: cosmetic/partial/severe all = WorkdaysWithin72Hours
  //   NOVAC: cosmetic/partial = WorkdaysWithin48Hours, severe = WorkdaysWithin8Hours

  // Fetch company configs for SLA thresholds
  const { data: companyConfigs } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_company_configurations",
    "accommodation_id, cosmetic_issue_response_time, partial_limitation_response_time, severe_deficiency_response_time"
  );
  // Fetch deficiencies for SLA calculation
  const { data: slaDefData } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_deficiencies",
    "id, real_estate_property_id, deficiency_types, time_added, next_follow_up, deficiency_state"
  );
  const { data: slaAccData } = await fetchAllFromTable(
    supabase,
    "azure_accommodations",
    "id, name, brand"
  );
  const { data: slaCondData } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_condominia",
    "id, accommodation_id"
  );
  const { data: slaPropData } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_properties",
    "id, real_estate_condominium_id"
  );

  // Build lookup chain for SLA
  const slaAccMap = new Map((slaAccData ?? []).map((a) => [a.id, a]));
  const slaCondMap = new Map((slaCondData ?? []).map((c) => [c.id, c]));
  const slaPropMap = new Map((slaPropData ?? []).map((p) => [p.id, p]));
  const configMap = new Map(
    (companyConfigs ?? []).map((c) => [c.accommodation_id as string, c])
  );

  // Parse SLA threshold string to hours
  function parseSlaHours(threshold: string | null | undefined): number {
    if (!threshold) return 72;
    if (threshold.includes("8Hours")) return 8;
    if (threshold.includes("24Hours")) return 24;
    if (threshold.includes("48Hours")) return 48;
    if (threshold.includes("72Hours")) return 72;
    return 72; // default
  }

  let slaCompliant = 0;
  let slaBreached = 0;
  let slaAtRisk = 0;

  for (const d of slaDefData ?? []) {
    if (!d.time_added || !d.next_follow_up) continue;
    const followUp = new Date(d.next_follow_up as string);
    if (followUp.getFullYear() <= 2000) continue; // skip 0001-01-01

    const prop = slaPropMap.get(d.real_estate_property_id);
    if (!prop) continue;
    const cond = slaCondMap.get((prop as Record<string, unknown>).real_estate_condominium_id);
    if (!cond) continue;
    const acc = slaAccMap.get((cond as Record<string, unknown>).accommodation_id);
    if (!acc) continue;

    // Apply brand filter
    if (filters.brand && filters.brand !== "all") {
      const brandName = String((acc as Record<string, unknown>).brand || (acc as Record<string, unknown>).name || "");
      if (!brandName.toLowerCase().includes(filters.brand.toLowerCase())) continue;
    }

    // Apply date filter
    const addedDate = new Date(d.time_added as string);
    if (filters.dateFrom && addedDate < new Date(filters.dateFrom)) continue;
    if (filters.dateTo && addedDate > new Date(`${filters.dateTo}T23:59:59.999Z`)) continue;

    // Determine severity from deficiency_types: bit 13 (8192) = Emergency = severe
    const types = Number(d.deficiency_types) || 0;
    const isSevere = (types & 8192) > 0;

    const config = configMap.get((cond as Record<string, unknown>).accommodation_id as string);
    const slaHours = isSevere
      ? parseSlaHours(config?.severe_deficiency_response_time as string)
      : parseSlaHours(config?.cosmetic_issue_response_time as string);

    const responseHours =
      (followUp.getTime() - addedDate.getTime()) / (1000 * 60 * 60);

    if (responseHours <= slaHours) {
      slaCompliant++;
    } else if (responseHours <= slaHours * 1.5) {
      slaAtRisk++;
    } else {
      slaBreached++;
    }
  }
  const slaKnown = slaCompliant + slaBreached + slaAtRisk;
  const slaComplianceRate = safePercent(slaCompliant, slaKnown);

  // --- ADD-8: False Success Rate ---
  const falseSuccessCount = rows.filter(
    (r) => r.bug_false_success === true
  ).length;
  const falseSuccessRate = safePercent(falseSuccessCount, total);

  const failedReportCount = rows.filter(
    (r) => r.bug_failed_report === true
  ).length;
  const failedReportRate = safePercent(failedReportCount, total);

  // --- ADD-9: Message Count ---
  const msgRows = rows.filter((r) => r.message_count != null);
  const totalMessages = msgRows.reduce(
    (s, r) => s + Number(r.message_count || 0),
    0
  );
  const avgMessages = safeAvg(totalMessages, msgRows.length, 1);
  const totalInbound = msgRows.reduce(
    (s, r) => s + Number(r.inbound_count || 0),
    0
  );
  const totalAiMessages = msgRows.reduce(
    (s, r) => s + Number(r.ai_count || 0),
    0
  );

  // --- ADD-10: Language Distribution ---
  const langMap = new Map<string, number>();
  for (const r of rows) {
    if (r.language) {
      const lang = String(r.language);
      langMap.set(lang, (langMap.get(lang) || 0) + 1);
    }
  }
  const languageBreakdown = Array.from(langMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: safePercent(count, total),
    }))
    .sort((a, b) => b.count - a.count);

  // --- ADD-11: Repeat Tenant Rate ---
  const tenantCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.phone_number) {
      const phone = String(r.phone_number);
      tenantCounts.set(phone, (tenantCounts.get(phone) || 0) + 1);
    }
  }
  const uniqueTenants = tenantCounts.size;
  const repeatTenants = Array.from(tenantCounts.values()).filter(
    (c) => c > 1
  ).length;
  const repeatTenantRate = safePercent(repeatTenants, uniqueTenants);

  // --- ADD-12: Loop Detection / Ping Pong ---
  const ppRows = rows.filter((r) => r.ping_pong_count != null);
  const withPingPong = ppRows.filter(
    (r) => Number(r.ping_pong_count) > 0
  ).length;
  const pingPongRate = safePercent(withPingPong, ppRows.length);
  const avgPingPong = safeAvg(
    ppRows.reduce((s, r) => s + Number(r.ping_pong_count || 0), 0),
    ppRows.length,
    2
  );
  const maxPingPong = ppRows.reduce(
    (max, r) => Math.max(max, Number(r.ping_pong_count || 0)),
    0
  );

  // Ping pong distribution by threshold
  const ppNormal = ppRows.filter(
    (r) => Number(r.ping_pong_count) <= 3
  ).length;
  const ppElevated = ppRows.filter(
    (r) =>
      Number(r.ping_pong_count) > 3 && Number(r.ping_pong_count) <= 6
  ).length;
  const ppConcerning = ppRows.filter(
    (r) =>
      Number(r.ping_pong_count) > 6 && Number(r.ping_pong_count) <= 10
  ).length;
  const ppLoop = ppRows.filter(
    (r) => Number(r.ping_pong_count) > 10
  ).length;

  const pingPongDistribution = [
    { label: "Normal (0-3)", count: ppNormal, percentage: safePercent(ppNormal, ppRows.length) },
    { label: "Erhoeht (4-6)", count: ppElevated, percentage: safePercent(ppElevated, ppRows.length) },
    { label: "Bedenklich (7-10)", count: ppConcerning, percentage: safePercent(ppConcerning, ppRows.length) },
    { label: "Loop (>10)", count: ppLoop, percentage: safePercent(ppLoop, ppRows.length) },
  ];

  // --- ADD-15: Bug Rate (bug_false_success OR bug_failed_report per MD guide) ---
  const bugFalseSuccess = rows.filter((r) => r.bug_false_success === true).length;
  const bugFailedReport = rows.filter((r) => r.bug_failed_report === true).length;
  const bugCount = rows.filter(
    (r) => r.bug_false_success === true || r.bug_failed_report === true
  ).length;
  const bugRate = safePercent(bugCount, total);

  // --- ADD-17: Tenant Adoption Rate ---
  // Get total managed units filtered by brand (MD: join chain with brand filter)
  const { data: accDataAdopt } = await fetchAllFromTable(
    supabase,
    "azure_accommodations",
    "id, name, brand"
  );
  const { data: condDataAdopt } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_condominia",
    "id, accommodation_id"
  );
  const { data: propData } = await fetchAllFromTable(
    supabase,
    "azure_real_estate_properties",
    "id, real_estate_condominium_id"
  );

  // Build brand-filtered property count
  const accAdoptMap = new Map((accDataAdopt ?? []).map((a) => [a.id, a]));
  const condAdoptMap = new Map(
    (condDataAdopt ?? []).map((c) => [c.id, c])
  );
  let totalProperties = 0;
  for (const p of propData ?? []) {
    const cond = condAdoptMap.get(p.real_estate_condominium_id);
    const acc = cond ? accAdoptMap.get((cond as Record<string, unknown>).accommodation_id) : null;
    if (filters.brand && filters.brand !== "all") {
      const brandName = String((acc as Record<string, unknown>)?.brand || (acc as Record<string, unknown>)?.name || "");
      if (!brandName.toLowerCase().includes(filters.brand.toLowerCase())) continue;
    }
    totalProperties++;
  }

  // Monthly unique tenants for adoption trend
  const monthlyAdoption = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.started_at && r.phone_number) {
      const date = new Date(r.started_at as string);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyAdoption.has(monthKey)) {
        monthlyAdoption.set(monthKey, new Set());
      }
      monthlyAdoption.get(monthKey)!.add(String(r.phone_number));
    }
  }

  const adoptionTrend = Array.from(monthlyAdoption.entries())
    .map(([period, tenants]) => ({
      period,
      uniqueTenants: tenants.size,
      adoptionRate: safePercent(tenants.size, totalProperties),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const currentAdoptionRate =
    adoptionTrend.length > 0
      ? adoptionTrend[adoptionTrend.length - 1].adoptionRate
      : 0;

  // --- ADD-13: Tenant Effort Score (proxy) ---
  // Computed as composite from available fields
  const effortRows = rows.filter(
    (r) =>
      r.inbound_count != null &&
      r.duration_minutes != null &&
      r.ping_pong_count != null
  );

  function scoreInbound(count: number): number {
    if (count <= 3) return 1;
    if (count <= 6) return 3;
    if (count <= 10) return 5;
    if (count <= 15) return 7;
    return 9;
  }
  function scoreTime(mins: number): number {
    if (mins <= 5) return 1;
    if (mins <= 15) return 3;
    if (mins <= 30) return 5;
    if (mins <= 60) return 7;
    return 9;
  }
  function scoreFriction(pp: number): number {
    if (pp <= 2) return 1;
    if (pp <= 5) return 3;
    if (pp <= 8) return 5;
    if (pp <= 12) return 7;
    return 9;
  }
  function scoreResolution(outcome: string): number {
    if (outcome === "resolved") return 1;
    if (outcome === "no_response") return 5;
    if (outcome === "unresolved") return 7;
    return 9;
  }

  const effortScores = effortRows.map((r) => {
    const inbound = scoreInbound(Number(r.inbound_count || 0));
    const time = scoreTime(Math.min(Number(r.duration_minutes || 0), 60));
    const friction = scoreFriction(Number(r.ping_pong_count || 0));
    const resolution = scoreResolution(String(r.event_outcome || ""));
    return 0.3 * inbound + 0.2 * time + 0.25 * friction + 0.25 * resolution;
  });

  const avgEffortScore =
    effortScores.length > 0
      ? safeAvg(
          effortScores.reduce((s, v) => s + v, 0),
          effortScores.length,
          2
        )
      : 0;

  // --- Automation rate ---
  const automationRates = rows
    .filter((r) => r.automation_rate != null)
    .map((r) => Number(r.automation_rate));
  const avgAutomationRate =
    automationRates.length > 0
      ? safeAvg(
          automationRates.reduce((s, v) => s + v, 0),
          automationRates.length,
          3
        )
      : 0;

  return NextResponse.json({
    totalEvents: total,
    // ADD-5
    avgFirstResponseSec,
    medianFirstResponseSec,
    // ADD-6
    slaComplianceRate,
    slaCompliant,
    slaBreached,
    slaAtRisk,
    // ADD-8
    falseSuccessCount,
    falseSuccessRate,
    failedReportCount,
    failedReportRate,
    // ADD-9
    totalMessages,
    avgMessages,
    totalInbound,
    totalAiMessages,
    // ADD-10
    languageBreakdown,
    // ADD-11
    uniqueTenants,
    repeatTenants,
    repeatTenantRate,
    // ADD-12
    pingPongRate,
    avgPingPong,
    maxPingPong,
    pingPongDistribution,
    // ADD-13
    avgEffortScore,
    // ADD-15
    bugCount,
    bugRate,
    bugFalseSuccess,
    bugFailedReport,
    // ADD-17
    totalProperties,
    adoptionTrend,
    currentAdoptionRate,
    // General
    avgAutomationRate,
  });
}
