"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { ChartCard } from "@/components/shared/chart-card";
import { PageContainer } from "@/components/layout/page-container";
import { ChartSkeleton } from "@/components/shared/loading-skeleton";
import { getGermanLabel } from "@/lib/utils/german-labels";
import { chartColors } from "@/lib/constants/kpi-config";

interface BreakdownItem { label: string; count: number; percentage: number; }
interface SummaryData { resolutionBreakdown: BreakdownItem[]; outcomeBreakdown: BreakdownItem[]; }

interface TooltipPayload { value: number; name: string; }
interface TooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string; }

function CustomBarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (<div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md"><p className="font-medium">{label}</p><p className="text-muted-foreground">Anzahl: {payload[0].value}</p></div>);
}

function CustomPieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (<div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md"><p className="font-medium">{payload[0].name}</p><p className="text-muted-foreground">Anzahl: {payload[0].value}</p></div>);
}

interface PieLabelProps { germanLabel: string; percentage: number; }
function renderPieLabel({ germanLabel, percentage }: PieLabelProps): string {
  return germanLabel + " (" + percentage.toFixed(0) + "%)";
}

export default function KostenPage() {
  const { data, isLoading, error } = useDashboardData<SummaryData>("/api/summary");

  const resolutionData = useMemo(() => {
    if (!data?.resolutionBreakdown) return [];
    return data.resolutionBreakdown.map((item) => ({ ...item, germanLabel: getGermanLabel(item.label) }));
  }, [data]);

  const outcomeData = useMemo(() => {
    if (!data?.outcomeBreakdown) return [];
    return data.outcomeBreakdown.map((item) => ({ ...item, germanLabel: getGermanLabel(item.label) }));
  }, [data]);

  return (
    <PageContainer title="Kosten & Strategie" description="Kostenanalyse und Loesungsstrategien">
      {error && (<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.</div>)}
      <section>
        <h2 className="text-lg font-semibold mb-4">Loesungsmethoden</h2>
        {isLoading ? (<ChartSkeleton />) : resolutionData.length > 0 ? (
          <ChartCard title="Verteilung der Loesungsmethoden" subtitle="Wie wurden Anfragen geloest?">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={resolutionData} dataKey="count" nameKey="germanLabel" cx="50%" cy="50%" outerRadius={120} innerRadius={60} label={renderPieLabel} labelLine>
                  {resolutionData.map((_, i) => (<Cell key={"res-" + i} fill={chartColors[i % chartColors.length]} />))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">Ergebnisverteilung</h2>
        {isLoading ? (<ChartSkeleton />) : outcomeData.length > 0 ? (
          <ChartCard title="Ergebnis der Anfragen" subtitle="Endstatus der Mieteranfragen">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={outcomeData} layout="horizontal" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="germanLabel" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" fill={chartColors[4]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">Kostenuebersicht</h2>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <h3 className="text-lg font-semibold">Detaillierte Kostendaten</h3>
            <p className="text-sm text-muted-foreground">
              Detaillierte Kostendaten werden in Kuerze verfuegbar sein. Besuchen Sie die{" "}
              <a href="/roi" className="text-primary underline underline-offset-2 hover:text-primary/80">ROI-Seite</a>{" "}
              fuer eine aktuelle Kostenvergleichsanalyse.
            </p>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
