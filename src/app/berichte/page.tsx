"use client";

import { useMemo } from "react";
import { Users, Building2, Briefcase } from "lucide-react";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { PageContainer } from "@/components/layout/page-container";
import { PlaceholderCard } from "@/components/shared/placeholder-card";
import {
  KPICardSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw } from "@/lib/utils/formatting";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

interface TenantItem {
  name: string;
  phone: string;
  count: number;
}

interface ReportsData {
  totalDeficiencies: number;
  uniqueTenants: number;
  uniqueBuildings: number;
  portfolioBreakdown: BreakdownItem[];
  tenantBreakdown: TenantItem[];
  topUsers: TenantItem[];
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function BerichtePage() {
  const { data, isLoading, error } =
    useDashboardData<ReportsData>("/api/reports");

  const portfolioColumns = useMemo<ColumnDef<BreakdownItem>[]>(
    () => [
      { key: "label", header: "Portfolio / Brand", accessor: (row) => row.label, sortable: true },
      { key: "count", header: "Maengel", accessor: (row) => row.count, align: "right", sortable: true },
      { key: "percentage", header: "%", accessor: (row) => row.percentage, render: (v) => formatPercentRaw(Number(v)), align: "right", sortable: true },
    ],
    []
  );

  const tenantColumns = useMemo<ColumnDef<TenantItem>[]>(
    () => [
      { key: "name", header: "Mieter", accessor: (row) => row.name, sortable: true },
      { key: "phone", header: "Telefon", accessor: (row) => row.phone, sortable: true },
      { key: "count", header: "Maengel", accessor: (row) => row.count, align: "right", sortable: true },
    ],
    []
  );

  return (
    <PageContainer
      title="Berichte"
      description="KPIs #25-30, #36 — Berichtsdimensionen nach Eigentuemer, Gebaeude, Mieter"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten.
        </div>
      )}

      {/* Hero KPIs */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Ueberblick</h2>
        {isLoading ? (
          <KPIGrid columns={3}>
            {Array.from({ length: 3 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : data ? (
          <KPIGrid columns={3}>
            <KPICard
              title="Gesamte Maengel"
              value={formatNumber(data.totalDeficiencies)}
              icon={Briefcase}
              thresholdColor="blue"
            />
            <KPICard
              title="Verschiedene Mieter"
              value={formatNumber(data.uniqueTenants)}
              subtitle="KPI #30 — Unique Mieter mit Maengeln"
              icon={Users}
              thresholdColor="blue"
            />
            <KPICard
              title="Gebaeude"
              value={formatNumber(data.uniqueBuildings)}
              subtitle="Verschiedene Liegenschaften"
              icon={Building2}
              thresholdColor="blue"
            />
          </KPIGrid>
        ) : null}
      </section>

      {/* KPI #26: Per Portfolio */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPI #26 — Maengel pro Portfolio
        </h2>
        {isLoading ? (
          <TableSkeleton rows={3} />
        ) : data?.portfolioBreakdown ? (
          <DataTable
            data={data.portfolioBreakdown}
            columns={portfolioColumns}
            pageSize={10}
            emptyMessage="Keine Portfolio-Daten"
          />
        ) : null}
      </section>

      {/* KPI #30 + #36: Per Tenant / Top Users */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPI #30 / #36 — Maengel pro Mieter
        </h2>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : data?.tenantBreakdown ? (
          <DataTable
            data={data.tenantBreakdown}
            columns={tenantColumns}
            pageSize={15}
            emptyMessage="Keine Mieterdaten"
          />
        ) : null}
      </section>

      {/* PARTIAL KPIs — Under Construction */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Weitere Berichtsdimensionen
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PlaceholderCard
            kpiNumber="KPI #25"
            title="Maengel pro Eigentuemer"
            status="under-construction"
            description="NOVAC hat keine Eigentuemerdaten. PH: Daten vorhanden."
          />
          <PlaceholderCard
            kpiNumber="KPI #27"
            title="Maengel pro Liegenschaft"
            status="under-construction"
            description="Nur Maengel mit Azure-Verknuepfung verfuegbar."
          />
          <PlaceholderCard
            kpiNumber="KPI #28"
            title="Maengel pro Einheit"
            status="under-construction"
            description="Nur 53% der Einheiten haben Wohnungsnummern."
          />
          <PlaceholderCard
            kpiNumber="KPI #29"
            title="Maengel pro Postleitzahl"
            status="under-construction"
            description="PLZ muss via Regex aus Adresse extrahiert werden."
          />
          <PlaceholderCard
            kpiNumber="KPI #14-17"
            title="Daten-Matching"
            status="under-construction"
            description="Mieter-Einheit-Gebaeude-Eigentuemer-Verknuepfung. 5 Datenluecken identifiziert."
          />
        </div>
      </section>

      {/* Data availability: KPIs #1-13 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPIs #1-13 — Datenverfuegbarkeit
        </h2>
        <div className="rounded-xl border bg-card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { num: "#1", name: "Eigentuemer", status: "partial" },
              { num: "#2", name: "Fonds", status: "none" },
              { num: "#3", name: "Verwaltung (PM)", status: "ok" },
              { num: "#4", name: "Liegenschafts-Adresse", status: "ok" },
              { num: "#5", name: "Einheitsdetails", status: "partial" },
              { num: "#6", name: "Mietername", status: "ok" },
              { num: "#7", name: "Mieter-E-Mail", status: "ok" },
              { num: "#8", name: "Mobilnummer", status: "ok" },
              { num: "#9", name: "Geburtsdatum", status: "none" },
              { num: "#10", name: "Geschlecht", status: "none" },
              { num: "#11", name: "Einwilligung", status: "none" },
              { num: "#12", name: "Einzugsdatum", status: "none" },
              { num: "#13", name: "Nutzungsart", status: "none" },
            ].map((item) => (
              <div
                key={item.num}
                className="flex items-center gap-2 text-sm py-1"
              >
                <div
                  className={
                    "h-2.5 w-2.5 rounded-full " +
                    (item.status === "ok"
                      ? "bg-emerald-500"
                      : item.status === "partial"
                      ? "bg-amber-500"
                      : "bg-slate-300")
                  }
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {item.num}
                </span>
                <span>{item.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {item.status === "ok"
                    ? "Vorhanden"
                    : item.status === "partial"
                    ? "Teilweise"
                    : "Nicht vorhanden"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
