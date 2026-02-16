// ============================================================
// /api/bugs/clusters — Bug cluster overview
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { BugCluster } from "@/lib/types/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("bug_clusters")
    .select("*")
    .order("status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return NextResponse.json({ clusters: [] });
  }

  // Map snake_case DB columns to camelCase for the frontend
  const clusters: BugCluster[] = rows.map((row) => ({
    id: row.id,
    clusterLabel: row.cluster_label,
    bugCategory: row.bug_category,
    rootCauseDescription: row.root_cause_description ?? null,
    eventCount: row.event_count ?? 0,
    firstSeenAt: row.first_seen_at ?? null,
    lastSeenAt: row.last_seen_at ?? null,
    linearParentIssueId: row.linear_parent_issue_id ?? null,
    sprintReady: row.sprint_ready ?? false,
    status: row.status,
  }));

  return NextResponse.json({ clusters });
}
