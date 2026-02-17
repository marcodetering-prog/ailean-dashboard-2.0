// ============================================================
// /api/summary — Main overview endpoint with all aggregate KPIs
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
  safeAvg,
} from "@/lib/queries/base";
import type { SummaryResponse, BreakdownItem } from "@/lib/types/api";

// ---------------------------------------------------------------------------
// Row type — v_dashboard_base returns untyped rows from Supabase
// ---------------------------------------------------------------------------
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

function countTrue(rows: Row[], field: string): number {
  return rows.filter((r) => r[field] === true).length;
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

  const { data, error } = await createBaseQuery(supabase, filters);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  const total = rows.length;

  // --- Aggregate KPIs ---------------------------------------------------

  const totalWithDeficiencyReport = countTrue(rows, "has_deficiency_report");
  const loopCount = countTrue(rows, "ai_loop_detected");
  const misunderstandingCount = countTrue(rows, "ai_misunderstood");
  const bugCount = countTrue(rows, "is_bug");
  const correctTriageCount = countTrue(rows, "ai_correct_triage");
  const urgentCount = countTrue(rows, "is_urgent");
  const agentTakeoverCount = countTrue(rows, "has_agent_takeover");

  const summary: SummaryResponse = {
    // Counts & rates
    totalEvents: total,
    totalWithDeficiencyReport,
    deficiencyReportRate: safePercent(totalWithDeficiencyReport, total),
    avgAiQualityScore: avgField(rows, "ai_quality_score"),
    avgTenantEffort: avgField(rows, "tenant_effort_score"),
    loopDetectionRate: safePercent(loopCount, total),
    misunderstandingRate: safePercent(misunderstandingCount, total),
    bugRate: safePercent(bugCount, total),
    correctTriageRate: safePercent(correctTriageCount, total),
    avgUnnecessaryQuestions: avgField(rows, "ai_unnecessary_questions"),
    urgencyRate: safePercent(urgentCount, total),
    automationRate: avgField(rows, "automation_rate"),
    avgFirstResponseSec: avgField(rows, "first_response_sec"),
    avgDurationMin: avgField(rows, "duration_minutes"),
    avgTimeToReportSec: avgField(rows, "time_to_report_sec") || null,
    agentTakeoverRate: safePercent(agentTakeoverCount, total),

    // --- Breakdowns -------------------------------------------------------

    sentimentBreakdown: mapToBreakdown(
      groupBy(rows, (r) => r.tenant_sentiment),
      total
    ),
    severityBreakdown: mapToBreakdown(
      groupBy(rows, (r) => r.estimated_severity),
      total
    ),
    categoryBreakdown: mapToBreakdown(
      groupBy(rows, (r) => r.deficiency_category),
      total
    ),
    resolutionBreakdown: mapToBreakdown(
      groupBy(rows, (r) => r.resolution_method),
      total
    ),
    intentBreakdown: mapToBreakdown(groupBy(rows, (r) => r.intent), total),
    outcomeBreakdown: mapToBreakdown(
      groupBy(rows, (r) => r.event_outcome),
      total
    ),
    inquiryTypeBreakdown: mapToBreakdown(
      groupBy(rows, (r) => r.inquiry_type),
      total
    ),
    stateBreakdown: mapToBreakdown(
      groupBy(rows, (r) =>
        r.deficiency_state_label != null
          ? r.deficiency_state_label
          : "Kein Mangel"
      ),
      total
    ),

    // Language & SLA
    languageBreakdown: mapToBreakdown(
      groupBy(rows, (r) => r.language),
      total
    ),
    slaBreakdown: mapToBreakdown(
      groupBy(rows, (r) => r.sla_compliance),
      total
    ),

    // Score distributions
    qualityScoreDistribution: mapToBreakdown(
      groupBy(rows, (r) =>
        r.ai_quality_score != null
          ? String(Math.round(Number(r.ai_quality_score)))
          : null
      ),
      total
    ),
    effortScoreDistribution: mapToBreakdown(
      groupBy(rows, (r) =>
        r.tenant_effort_score != null
          ? String(Math.round(Number(r.tenant_effort_score)))
          : null
      ),
      total
    ),

    // Top topics
    topTopics: mapToBreakdown(
      groupBy(rows, (r) => r.topic_label),
      total
    ),

    // Timing breakdowns
    businessHoursBreakdown: mapToBreakdown(
      groupBy(rows, (r) =>
        r.is_inside_hours === true
          ? "inside"
          : r.is_inside_hours === false
            ? "outside"
            : null
      ),
      total
    ),
    dayOfWeekBreakdown: mapToBreakdown(
      groupBy(rows, (r) =>
        r.started_dow != null ? String(r.started_dow) : null
      ),
      total
    ),
    hourOfDayBreakdown: mapToBreakdown(
      groupBy(rows, (r) =>
        r.started_hour_cet != null ? String(r.started_hour_cet) : null
      ),
      total
    ),
  };

  return NextResponse.json(summary);
}
