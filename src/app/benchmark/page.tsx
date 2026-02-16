"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { PageContainer } from "@/components/layout/page-container";
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw, formatDuration, formatMinutes } from "@/lib/utils/formatting";
import { getThresholdColor, getInverseThresholdColor, thresholds, inverseThresholds } from "@/lib/utils/thresholds";
import { getGermanLabel } from "@/lib/utils/german-labels";
import { chartColors } from "@/lib/constants/kpi-config";

interface BreakdownItem { label: string; count: number; percentage: number; }
interface BenchmarkItem {
  brand: string; totalEvents: number; avgQualityScore: number; automationRate: number;
  loopRate: number; bugRate: number; avgFirstResponseSec: number; avgDurationMin: number;
  deficiencyReportRate: number; sentimentBreakdown: BreakdownItem[];
}

interface TooltipPayload { value: number; name: string; color?: string; }
interface TooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string; }

function GroupedBarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function BenchmarkPage() {
  const { data, isLoading, error } = useDashboardData<BenchmarkItem[]>("/api/benchmark");
  const brands = data ?? [];

  const comparisonData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const metrics: { key: keyof BenchmarkItem; label: string }[] = [
      { key: "avgQualityScore", label: "Qualitaetsscore" },
      { key: "automationRate", label: "Automatisierung %" },
      { key: "loopRate", label: "Loop Rate %" },
      { key: "bugRate", label: "Bug Rate %" },
      { key: "deficiencyReportRate", label: "Maengelberichte %" },
    ];
    return metrics.map((metric) => {
      const point: Record<string, string | number> = { metric: metric.label };
      for (const brand of data) {
        point[getGermanLabel(brand.brand)] = Number((brand[metric.key] as number).toFixed(1));
      }
      return point;
    });
  }, [data]);

  const brandLabels = useMemo(() => {
    if (!data) return [];
    return data.map((b) => getGermanLabel(b.brand));
  }, [data]);

  const columns = useMemo<ColumnDef<BenchmarkItem>[]>(
    () => [
      { key: "brand", header: "Marke", accessor: (row) => row.brand, render: (value) => (<span className="font-medium">{getGermanLabel(String(value))}</span>), sortable: true },
      { key: "totalEvents", header: "Anfragen", accessor: (row) => row.totalEvents, render: (value) => formatNumber(Number(value)), align: "right" as const, sortable: true },
      { key: "avgQualityScore", header: "Qualitaet", accessor: (row) => row.avgQualityScore, render: (value) => Number(value).toFixed(1) + "/5", align: "right" as const, sortable: true },
      { key: "automationRate", header: "Automatisierung", accessor: (row) => row.automationRate, render: (value) => formatPercentRaw(Number(value)), align: "right" as const, sortable: true },
      { key: "loopRate", header: "Loop Rate", accessor: (row) => row.loopRate, render: (value) => formatPercentRaw(Number(value)), align: "right" as const, sortable: true },
      { key: "bugRate", header: "Bug Rate", accessor: (row) => row.bugRate, render: (value) => formatPercentRaw(Number(value)), align: "right" as const, sortable: true },
      { key: "avgFirstResponseSec", header: "Erste Antwort", accessor: (row) => row.avgFirstResponseSec, render: (value) => formatDuration(Number(value)), align: "right" as const, sortable: true },
      { key: "avgDurationMin", header: "Dauer", accessor: (row) => row.avgDurationMin, render: (value) => formatMinutes(Number(value)), align: "right" as const, sortable: true },
      { key: "deficiencyReportRate", header: "Maengelberichte", accessor: (row) => row.deficiencyReportRate, render: (value) => formatPercentRaw(Number(value)), align: "right" as const, sortable: true },
    ],
    []
  );

  return (
    <PageContainer title="Benchmark" description="Markenvergleich der wichtigsten KPIs">
      {error && (<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.</div>)}
      <section>
        <h2 className="text-lg font-semibold mb-4">Markenvergleich</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <KPICardSkeleton />
                <KPIGrid columns={2}>{Array.from({ length: 4 }).map((_, j) => (<KPICardSkeleton key={j} />))}</KPIGrid>
              </div>
            ))}
          </div>
        ) : brands.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {brands.map((brand) => (
              <div key={brand.brand} className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{getGermanLabel(brand.brand)}</h3>
                  <span className="text-sm text-muted-foreground">{formatNumber(brand.totalEvents)} Anfragen</span>
                </div>
                <KPIGrid columns={2}>
                  <KPICard title="Qualitaetsscore" value={brand.avgQualityScore.toFixed(1) + "/5"} thresholdColor={getThresholdColor(brand.avgQualityScore, thresholds.aiQualityScore)} />
                  <KPICard title="Automatisierung" value={formatPercentRaw(brand.automationRate)} thresholdColor="blue" />
                  <KPICard title="Loop Rate" value={formatPercentRaw(brand.loopRate)} thresholdColor={getInverseThresholdColor(brand.loopRate, inverseThresholds.loopRate)} />
                  <KPICard title="Bug Rate" value={formatPercentRaw(brand.bugRate)} thresholdColor={getInverseThresholdColor(brand.bugRate, inverseThresholds.bugRate)} />
                </KPIGrid>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-muted-foreground">Erste Antwort</p>
                    <p className="font-medium">{formatDuration(brand.avgFirstResponseSec)}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-muted-foreground">Durchschn. Dauer</p>
                    <p className="font-medium">{formatMinutes(brand.avgDurationMin)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">KPI-Vergleich</h2>
        {isLoading ? (<ChartSkeleton />) : comparisonData.length > 0 ? (
          <ChartCard title="Metriken im Vergleich" subtitle="Vergleich der wichtigsten KPIs zwischen Marken">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={comparisonData} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<GroupedBarTooltip />} />
                <Legend />
                {brandLabels.map((label, i) => (
                  <Bar key={label} dataKey={label} fill={chartColors[i % chartColors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">Detailvergleich</h2>
        {isLoading ? (<TableSkeleton rows={3} />) : brands.length > 0 ? (
          <DataTable data={brands} columns={columns} pageSize={10} emptyMessage="Keine Benchmark-Daten vorhanden" />
        ) : null}
      </section>
    </PageContainer>
  );
}
