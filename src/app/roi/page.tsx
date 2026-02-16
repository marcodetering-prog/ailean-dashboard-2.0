"use client";

import { useMemo } from "react";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { PageContainer } from "@/components/layout/page-container";
import { KPICardSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton";
import { formatCHF } from "@/lib/utils/formatting";

interface CategoryBreakdownItem { category: string; count: number; manualCost: number; aileanCost: number; savings: number; }
interface ROIData {
  totalUnits: number;
  totalInquiries: number;
  categoryBreakdown: CategoryBreakdownItem[];
  kostenOhneAilean: number;
  kostenMitAilean: number;
  ersparnis: number;
  savingsPercentage: number;
}

export default function RoiPage() {
  const { data, isLoading, error } = useDashboardData<ROIData>("/api/roi");

  const columns = useMemo<ColumnDef<CategoryBreakdownItem>[]>(
    () => [
      { key: "category", header: "Kategorie", accessor: (row) => row.category, sortable: true },
      { key: "count", header: "Anzahl", accessor: (row) => row.count, align: "right" as const, sortable: true },
      { key: "manualCost", header: "Kosten manuell", accessor: (row) => row.manualCost, render: (value) => formatCHF(Number(value)), align: "right" as const, sortable: true },
      { key: "aileanCost", header: "Kosten AILEAN", accessor: (row) => row.aileanCost, render: (value) => formatCHF(Number(value)), align: "right" as const, sortable: true },
      { key: "savings", header: "Ersparnis", accessor: (row) => row.savings, render: (value) => (<span className="font-medium text-emerald-700">{formatCHF(Number(value))}</span>), align: "right" as const, sortable: true },
    ],
    []
  );

  return (
    <PageContainer title="ROI Rechner" description="Kostenvergleich: Manuelle Bearbeitung vs. AILEAN">
      {error && (<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.</div>)}
      <section>
        <h2 className="text-lg font-semibold mb-4">Kostenvergleich</h2>
        {isLoading ? (
          <KPIGrid columns={3}>{Array.from({ length: 3 }).map((_, i) => (<KPICardSkeleton key={i} />))}</KPIGrid>
        ) : data ? (
          <KPIGrid columns={3}>
            <KPICard title="Kosten ohne AILEAN" value={formatCHF(data.kostenOhneAilean)} subtitle={data.totalInquiries + " Anfragen, " + data.totalUnits + " Einheiten"} icon={DollarSign} thresholdColor="red" />
            <KPICard title="Kosten mit AILEAN" value={formatCHF(data.kostenMitAilean)} subtitle="Ihre aktuellen Kosten" icon={TrendingDown} thresholdColor="green" />
            <KPICard title="Ihre Ersparnis" value={formatCHF(data.ersparnis)} subtitle="Gesparte Kosten mit AILEAN" icon={TrendingUp} thresholdColor="green" />
          </KPIGrid>
        ) : null}
      </section>
      {!isLoading && data && (
        <section>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="text-sm font-medium text-emerald-700 mb-2">Gesamtersparnis</p>
            <p className="text-6xl font-bold tracking-tight text-emerald-700">{data.savingsPercentage.toFixed(0)}%</p>
            <p className="text-sm text-emerald-600 mt-2">Kostenreduktion durch AILEAN</p>
          </div>
        </section>
      )}
      {isLoading && (
        <section>
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="animate-pulse space-y-3 text-center">
              <div className="mx-auto h-4 w-32 rounded bg-muted" />
              <div className="mx-auto h-16 w-24 rounded bg-muted" />
              <div className="mx-auto h-4 w-48 rounded bg-muted" />
            </div>
          </div>
        </section>
      )}
      <section>
        <h2 className="text-lg font-semibold mb-4">Aufschluesselung nach Kategorie</h2>
        {isLoading ? (<TableSkeleton rows={4} />) : data?.categoryBreakdown ? (
          <DataTable data={data.categoryBreakdown} columns={columns} pageSize={10} emptyMessage="Keine Kostendaten vorhanden" />
        ) : null}
      </section>
    </PageContainer>
  );
}
