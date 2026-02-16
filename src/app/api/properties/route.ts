// ============================================================
// /api/properties — Property owner statistics
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
  safeAvg,
} from "@/lib/queries/base";
import type { PropertyOwnerStats } from "@/lib/types/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  // 1. Fetch all rows from v_dashboard_base
  const { data, error } = await createBaseQuery(supabase, filters);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return NextResponse.json({ owners: [], severityMatrix: [] });
  }

  // 2. Fetch tenant_profiles for property owner mapping
  const { data: profileData, error: profileError } = await supabase
    .from("tenant_profiles")
    .select("*");

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  // Build a lookup: conversation_id -> tenant profile
  const profiles = (profileData ?? []) as Row[];
  const profileMap = new Map<string, Row>();
  for (const p of profiles) {
    if (p.conversation_id) {
      profileMap.set(p.conversation_id, p);
    }
  }

  // 3. Group rows by property_owner
  const ownerMap = new Map<
    string,
    {
      totalInquiries: number;
      deficiencyReports: number;
      resolvedCount: number;
      tenants: Set<string>;
      qualityScores: number[];
    }
  >();

  for (const row of rows) {
    const profile = profileMap.get(row.conversation_id);
    const owner = profile?.property_owner || row.property_owner || "Unknown";

    const existing = ownerMap.get(owner) || {
      totalInquiries: 0,
      deficiencyReports: 0,
      resolvedCount: 0,
      tenants: new Set<string>(),
      qualityScores: [],
    };

    existing.totalInquiries += 1;

    if (row.has_deficiency_report === true) {
      existing.deficiencyReports += 1;
    }

    // Count as resolved if deficiency_state_label indicates resolution
    const resolvedStates = [
      "resolved",
      "completed",
      "closed",
      "done",
      "fertig",
      "abgeschlossen",
    ];
    if (
      row.deficiency_state_label &&
      resolvedStates.some((s) =>
        String(row.deficiency_state_label).toLowerCase().includes(s)
      )
    ) {
      existing.resolvedCount += 1;
    }

    // Track unique tenants
    const tenantId = profile?.tenant_id || row.conversation_id;
    existing.tenants.add(tenantId);

    if (row.ai_quality_score != null) {
      existing.qualityScores.push(Number(row.ai_quality_score));
    }

    ownerMap.set(owner, existing);
  }

  // 4. Build response
  const owners: PropertyOwnerStats[] = Array.from(ownerMap.entries())
    .map(([propertyOwner, s]) => ({
      propertyOwner,
      totalInquiries: s.totalInquiries,
      deficiencyReports: s.deficiencyReports,
      resolvedCount: s.resolvedCount,
      resolutionRate: safePercent(s.resolvedCount, s.deficiencyReports),
      tenantCount: s.tenants.size,
      avgQualityScore:
        s.qualityScores.length > 0
          ? safeAvg(
              s.qualityScores.reduce((a, b) => a + b, 0),
              s.qualityScores.length,
              2
            )
          : null,
    }))
    .sort((a, b) => b.totalInquiries - a.totalInquiries);

  // 5. Build severity matrix: severity × category
  const severityMatrixMap = new Map<string, number>();
  for (const row of rows) {
    const severity = row.estimated_severity || "unknown";
    const category = row.deficiency_category || "unknown";
    const key = `${severity}|${category}`;
    severityMatrixMap.set(key, (severityMatrixMap.get(key) || 0) + 1);
  }

  const severityMatrix = Array.from(severityMatrixMap.entries()).map(
    ([key, count]) => {
      const [severity, category] = key.split("|");
      return { severity, category, count };
    }
  );

  return NextResponse.json({ owners, severityMatrix });
}
