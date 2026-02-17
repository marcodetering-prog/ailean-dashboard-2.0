// ============================================================
// /api/properties — Property owner & building hierarchy stats
// Uses v_property_hierarchy view + v_dashboard_base for severity matrix
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  createBaseQuery,
  safePercent,
} from "@/lib/queries/base";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  // 1. Fetch hierarchy data from v_property_hierarchy
  let hierarchyQuery = supabase
    .from("v_property_hierarchy")
    .select("*");

  if (filters.brand && filters.brand !== "all") {
    hierarchyQuery = hierarchyQuery.eq("brand", filters.brand);
  }

  const { data: hierarchyData, error: hierarchyError } = await hierarchyQuery;

  if (hierarchyError) {
    return NextResponse.json(
      { error: hierarchyError.message },
      { status: 500 }
    );
  }

  const hierarchyRows = (hierarchyData ?? []) as Row[];

  // 2. Build owner-level aggregation with building details
  type OwnerEntry = {
    brand: string;
    totalInquiries: number;
    deficiencyReports: number;
    resolvedCount: number;
    tenantCount: number;
    qualityScoreSum: number;
    qualityScoreCount: number;
    durationSum: number;
    durationCount: number;
    buildings: Array<{
      address: string;
      totalInquiries: number;
      deficiencyReports: number;
      resolvedCount: number;
      tenantCount: number;
    }>;
  };

  const ownerMap = new Map<string, OwnerEntry>();

  for (const row of hierarchyRows) {
    const owner = row.property_owner || "Unbekannt";
    const existing: OwnerEntry = ownerMap.get(owner) || {
      brand: row.brand,
      totalInquiries: 0,
      deficiencyReports: 0,
      resolvedCount: 0,
      tenantCount: 0,
      qualityScoreSum: 0,
      qualityScoreCount: 0,
      durationSum: 0,
      durationCount: 0,
      buildings: [],
    };

    const inquiries = Number(row.total_inquiries) || 0;
    const deficiencies = Number(row.deficiency_reports) || 0;
    const resolved = Number(row.resolved_count) || 0;
    const tenants = Number(row.tenant_count) || 0;

    existing.totalInquiries += inquiries;
    existing.deficiencyReports += deficiencies;
    existing.resolvedCount += resolved;
    existing.tenantCount += tenants;

    if (row.avg_quality_score != null) {
      existing.qualityScoreSum += Number(row.avg_quality_score) * inquiries;
      existing.qualityScoreCount += inquiries;
    }
    if (row.avg_duration_min != null) {
      existing.durationSum += Number(row.avg_duration_min) * inquiries;
      existing.durationCount += inquiries;
    }

    if (row.building_address) {
      existing.buildings.push({
        address: row.building_address,
        totalInquiries: inquiries,
        deficiencyReports: deficiencies,
        resolvedCount: resolved,
        tenantCount: tenants,
      });
    }

    ownerMap.set(owner, existing);
  }

  // 3. Build owners array
  const owners = Array.from(ownerMap.entries())
    .map(([propertyOwner, s]) => ({
      propertyOwner,
      brand: s.brand,
      totalInquiries: s.totalInquiries,
      deficiencyReports: s.deficiencyReports,
      resolvedCount: s.resolvedCount,
      resolutionRate: safePercent(s.resolvedCount, s.deficiencyReports),
      tenantCount: s.tenantCount,
      avgQualityScore:
        s.qualityScoreCount > 0
          ? Number((s.qualityScoreSum / s.qualityScoreCount).toFixed(1))
          : null,
      avgDurationMin:
        s.durationCount > 0
          ? Number((s.durationSum / s.durationCount).toFixed(1))
          : null,
      buildings: s.buildings.sort(
        (a, b) => b.totalInquiries - a.totalInquiries
      ),
    }))
    .sort((a, b) => b.totalInquiries - a.totalInquiries);

  // 4. Build severity matrix from v_dashboard_base
  const { data: baseData, error: baseError } = await createBaseQuery(
    supabase,
    filters
  );

  let severityMatrix: Array<{
    severity: string;
    category: string;
    count: number;
  }> = [];

  if (!baseError && baseData) {
    const baseRows = baseData as Row[];
    const severityMatrixMap = new Map<string, number>();
    for (const row of baseRows) {
      if (row.has_deficiency_report !== true) continue;
      const severity = row.estimated_severity || "unknown";
      const category = row.deficiency_category || "unknown";
      const key = `${severity}|${category}`;
      severityMatrixMap.set(key, (severityMatrixMap.get(key) || 0) + 1);
    }

    severityMatrix = Array.from(severityMatrixMap.entries()).map(
      ([key, count]) => {
        const [severity, category] = key.split("|");
        return { severity, category, count };
      }
    );
  }

  return NextResponse.json({ owners, severityMatrix });
}
