// ============================================================
// /api/reports — Reporting dimension KPIs (#25-30, #36)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseFilters,
  fetchAllFromTable,
  safePercent,
} from "@/lib/queries/base";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const filters = parseFilters(request.nextUrl.searchParams);

  // Fetch azure tables
  const [accResult, condResult, propResult, defResult] = await Promise.all([
    fetchAllFromTable(supabase, "azure_accommodations", "id, name, brand"),
    fetchAllFromTable(supabase, "azure_real_estate_condominia", "id, accommodation_id, address, property_owner"),
    fetchAllFromTable(supabase, "azure_real_estate_properties", "id, real_estate_condominium_id, apartment_number"),
    fetchAllFromTable(supabase, "azure_real_estate_deficiencies", "id, real_estate_property_id, deficiency_types, deficiency_state, time_added, tenant_name, tenant_phone_number, tenant_email"),
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

  // Enrich and filter deficiencies
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
      if (filters.brand && filters.brand !== "all") {
        return String(d.brand).toLowerCase().includes(filters.brand.toLowerCase());
      }
      return true;
    })
    .filter((d) => {
      if (!d.time_added) return false;
      const added = new Date(d.time_added as string);
      if (filters.dateFrom && added < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && added > new Date(`${filters.dateTo}T23:59:59.999Z`)) return false;
      return true;
    });

  const total = enriched.length;

  // --- KPI #26: Reports per Portfolio (brand) ---
  const portfolioMap = new Map<string, number>();
  for (const d of enriched) {
    const brand = String(d.brand);
    portfolioMap.set(brand, (portfolioMap.get(brand) || 0) + 1);
  }
  const portfolioBreakdown = Array.from(portfolioMap.entries())
    .map(([label, count]) => ({ label, count, percentage: safePercent(count, total) }))
    .sort((a, b) => b.count - a.count);

  // --- KPI #30: Reports per Tenant ---
  const tenantMap = new Map<string, { name: string; phone: string; count: number }>();
  for (const d of enriched) {
    const phone = String(d.tenant_phone_number || "unknown");
    const existing = tenantMap.get(phone);
    if (existing) {
      existing.count++;
    } else {
      tenantMap.set(phone, {
        name: String(d.tenant_name || "Unbekannt"),
        phone,
        count: 1,
      });
    }
  }
  const tenantBreakdown = Array.from(tenantMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 50); // top 50

  // --- KPI #36: Who uses AILEAN most ---
  // Same as tenant breakdown, but with more detail
  const topUsers = Array.from(tenantMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // --- KPI #25: Reports per Owner ---
  const ownerMap = new Map<string, number>();
  for (const d of enriched) {
    const owner = d.property_owner ? String(d.property_owner) : "Unbekannt";
    ownerMap.set(owner, (ownerMap.get(owner) || 0) + 1);
  }
  const ownerBreakdown = Array.from(ownerMap.entries())
    .map(([label, count]) => ({ label, count, percentage: safePercent(count, total) }))
    .sort((a, b) => b.count - a.count);

  // --- KPI #27: Reports per Building ---
  const buildingMap = new Map<string, number>();
  for (const d of enriched) {
    const addr = String(d.building_address);
    buildingMap.set(addr, (buildingMap.get(addr) || 0) + 1);
  }
  const buildingBreakdown = Array.from(buildingMap.entries())
    .map(([label, count]) => ({ label, count, percentage: safePercent(count, total) }))
    .sort((a, b) => b.count - a.count);

  // --- KPI #28: Reports per Unit ---
  const unitMap = new Map<string, number>();
  for (const d of enriched) {
    if (d.apartment_number) {
      const unit = String(d.building_address) + " / " + String(d.apartment_number);
      unitMap.set(unit, (unitMap.get(unit) || 0) + 1);
    }
  }
  const unitBreakdown = Array.from(unitMap.entries())
    .map(([label, count]) => ({ label, count, percentage: safePercent(count, total) }))
    .sort((a, b) => b.count - a.count);
  const unitCoverage = safePercent(
    enriched.filter((d) => d.apartment_number).length,
    total
  );

  // --- KPI #29: Reports per Postal Code ---
  const postalMap = new Map<string, number>();
  const postalRegex = /(\d{4})\s+\w/;
  for (const d of enriched) {
    const addr = String(d.building_address);
    const match = addr.match(postalRegex);
    if (match) {
      postalMap.set(match[1], (postalMap.get(match[1]) || 0) + 1);
    }
  }
  const postalCodeBreakdown = Array.from(postalMap.entries())
    .map(([label, count]) => ({ label, count, percentage: safePercent(count, total) }))
    .sort((a, b) => b.count - a.count);

  // --- Summary stats ---
  const uniqueTenants = tenantMap.size;
  const uniqueBuildings = new Set(enriched.map((d) => d.building_address)).size;

  return NextResponse.json({
    totalDeficiencies: total,
    uniqueTenants,
    uniqueBuildings,
    portfolioBreakdown,
    tenantBreakdown,
    topUsers,
    ownerBreakdown,
    buildingBreakdown,
    unitBreakdown,
    unitCoverage,
    postalCodeBreakdown,
  });
}
