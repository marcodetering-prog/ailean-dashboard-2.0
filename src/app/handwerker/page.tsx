"use client";

import { useMemo } from "react";
import { Wrench, BarChart3, UserCheck, Hammer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { PipelineBar } from "@/components/shared/pipeline-bar";
import { PageContainer } from "@/components/layout/page-container";
import { KPICardSkeleton, ChartSkeleton } from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw, formatCHF } from "@/lib/utils/formatting";
import { getThresholdColor, thresholds } from "@/lib/utils/thresholds";
import { getGermanLabel } from "@/lib/utils/german-labels";
import { chartColors } from "@/lib/constants/kpi-config";

interface PipelineSegment { label: string; count: number; category: string; percentage: number; }
interface CategoryItem { category: string; count: number; totalCost: number; avgCost: number; }
interface CraftsmanData {
  overview: { totalJobs: number; completionRate: number; selfRepairCount: number; selfRepairRate: number; craftsmanAssignedRate: number; };
  pipeline: PipelineSegment[];
  categories: CategoryItem[];
  stateBreakdown: { label: string; count: number; percentage: number }[];
}

interface TooltipPayload { value: number; name: string; }
interface TooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string; }

function CountTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (<div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md"><p className="font-medium">{label}</p><p className="text-muted-foreground">Anzahl: {payload[0].value}</p></div>);
}

function CostTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (<div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md"><p className="font-medium">{label}</p><p className="text-muted-foreground">{formatCHF(payload[0].value)}</p></div>);
}

export default function HandwerkerPage() {
  const { data, isLoading, error } = useDashboardData<CraftsmanData>("/api/craftsman");

  const pipelineSegments = useMemo(() => {
    if (!data?.pipeline) return [];
    return data.pipeline.map((s) => ({ label: s.label, count: s.count, category: s.category }));
  }, [data]);

  const categoryData = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.map((item) => ({ ...item, germanLabel: getGermanLabel(item.category) }));
  }, [data]);

  return (
    <PageContainer title="Handwerker" description="Uebersicht ueber Handwerker-Auftraege und Reparaturstatus">
      {error && (<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.</div>)}
      <section>
        <h2 className="text-lg font-semibold mb-4">Wichtigste Kennzahlen</h2>
        {isLoading ? (
          <KPIGrid columns={4}>{Array.from({ length: 4 }).map((_, i) => (<KPICardSkeleton key={i} />))}</KPIGrid>
        ) : data ? (
          <KPIGrid columns={4}>
            <KPICard title="Auftraege" value={formatNumber(data.overview.totalJobs)} subtitle="Gesamt Handwerker-Auftraege" icon={Wrench} thresholdColor="blue" />
            <KPICard title="Erledigungsrate" value={formatPercentRaw(data.overview.completionRate)} subtitle="Abgeschlossene Auftraege" icon={BarChart3} thresholdColor={getThresholdColor(data.overview.completionRate, thresholds.completionRate)} />
            <KPICard title="Handwerker zugewiesen" value={formatPercentRaw(data.overview.craftsmanAssignedRate)} subtitle="Rate der Zuweisung" icon={UserCheck} thresholdColor="blue" />
            <KPICard title="Selbstreparaturen" value={formatNumber(data.overview.selfRepairCount)} subtitle={formatPercentRaw(data.overview.selfRepairRate) + " der Faelle"} icon={Hammer} thresholdColor="green" />
          </KPIGrid>
        ) : null}
      </section>
      {!isLoading && pipelineSegments.length > 0 && (
        <section><ChartCard title="Auftrags-Pipeline" subtitle="Verteilung nach Status"><PipelineBar segments={pipelineSegments} /></ChartCard></section>
      )}
      {isLoading && (<section><ChartSkeleton height="h-20" /></section>)}
      <section>
        <h2 className="text-lg font-semibold mb-4">Kategorieanalyse</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><ChartSkeleton /><ChartSkeleton /></div>
        ) : categoryData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Auftraege nach Kategorie" subtitle="Anzahl pro Mangelkategorie">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="horizontal" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="germanLabel" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CountTooltip />} />
                  <Bar dataKey="count" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Kosten nach Kategorie" subtitle="Gesamtkosten pro Mangelkategorie (CHF)">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="horizontal" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="germanLabel" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCHF(v, 0)} />
                  <Tooltip content={<CostTooltip />} />
                  <Bar dataKey="totalCost" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        ) : (<div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">Keine Kategoriedaten vorhanden.</div>)}
      </section>
    </PageContainer>
  );
}
