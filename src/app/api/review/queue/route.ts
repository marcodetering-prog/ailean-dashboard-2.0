// ============================================================
// /api/review/queue — Review queue: pending review items
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
} from "@/lib/queries/base";
import type { ReviewQueueItem } from "@/lib/types/api";

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
    return NextResponse.json([]);
  }

  // Filter to pending_review only and sort by started_at descending
  const pendingRows = rows
    .filter((r) => r.review_status === "pending_review")
    .sort((a, b) => {
      const dateA = a.started_at ? new Date(a.started_at).getTime() : 0;
      const dateB = b.started_at ? new Date(b.started_at).getTime() : 0;
      return dateB - dateA;
    });

  // Map to camelCase response objects
  const queue: ReviewQueueItem[] = pendingRows.map((row) => ({
    conversationId: row.conversation_id,
    inquirySequence: row.inquiry_sequence,
    reviewStatus: row.review_status,
    eventSummary: row.event_summary ?? null,
    deficiencyCategory: row.deficiency_category ?? null,
    aiQualityScore:
      row.ai_quality_score != null ? Number(row.ai_quality_score) : null,
    tenantSentiment: row.tenant_sentiment ?? null,
    isBug: row.is_bug ?? null,
    bugCategory: row.bug_category ?? null,
    bugClusterLabel: row.bug_cluster_label ?? null,
    linearIssueId: row.linear_issue_id ?? null,
    aiLoopDetected: row.ai_loop_detected ?? null,
    aiMisunderstood: row.ai_misunderstood ?? null,
    resolutionMethod: row.resolution_method ?? null,
    startedAt: row.started_at ?? null,
    brand: row.brand ?? null,
  }));

  return NextResponse.json(queue);
}
