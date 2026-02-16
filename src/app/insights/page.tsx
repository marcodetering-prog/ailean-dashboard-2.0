"use client";

import { useMemo } from "react";
import { Clock, Moon, Calendar, Sun } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { PageContainer } from "@/components/layout/page-container";
import { KPICardSkeleton, ChartSkeleton } from "@/components/shared/loading-skeleton";
import { formatPercentRaw } from "@/lib/utils/formatting";
import { dayOfWeekShortLabels } from "@/lib/utils/german-labels";
import { chartColors } from "@/lib/constants/kpi-config";

interface BreakdownItem { label: string | number; count: number; percentage: number; }
interface InsightsData {
  insideHoursCount: number; outsideHoursCount: number; insideHoursRate: number;
  peakDay: string; peakHour: number;
  dayOfWeekBreakdown: BreakdownItem[]; hourOfDayBreakdown: BreakdownItem[];
}

interface TooltipPayload { value: number; name: string; }
interface TooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string; }
function CustomBarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (<div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md"><p className="font-medium">{label}</p><p className="text-muted-foreground">Anzahl: {payload[0].value}</p></div>);
}

export default function InsightsPage() {
  const { data, isLoading, error } = useDashboardData<InsightsData>("/api/insights");

  const dayOfWeekData = useMemo(() => {
    if (!data?.dayOfWeekBreakdown) return [];
    return data.dayOfWeekBreakdown.map((item) => ({ ...item, germanLabel: dayOfWeekShortLabels[Number(item.label)] ?? String(item.label) }));
  }, [data]);

  const hourOfDayData = useMemo(() => {
    if (!data?.hourOfDayBreakdown) return [];
    return data.hourOfDayBreakdown.map((item) => ({ ...item, germanLabel: String(item.label).padStart(2, "0") + ":00" }));
  }, [data]);

  const outsideHoursRate = data ? 100 - data.insideHoursRate : 0;

  return (
    <PageContainer title="Insights" description="Zeitliche Muster und Nutzungsanalysen">
      {error && (<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.</div>)}
      <section>
        <h2 className="text-lg font-semibold mb-4">Geschaeftszeiten-Analyse</h2>
        {isLoading ? (
          <KPIGrid columns={4}>{Array.from({ length: 4 }).map((_, i) => (<KPICardSkeleton key={i} />))}</KPIGrid>
        ) : data ? (
          <KPIGrid columns={4}>
            <KPICard title="Waehrend Geschaeftszeiten" value={formatPercentRaw(data.insideHoursRate)} subtitle={data.insideHoursCount + " Anfragen"} icon={Sun} thresholdColor="green" />
            <KPICard title="Ausserhalb" value={formatPercentRaw(outsideHoursRate)} subtitle={data.outsideHoursCount + " Anfragen"} icon={Moon} thresholdColor="blue" />
            <KPICard title="Spitzentag" value={data.peakDay} subtitle="Tag mit den meisten Anfragen" icon={Calendar} thresholdColor="blue" />
            <KPICard title="Spitzenstunde" value={data.peakHour + ":00"} subtitle="Stunde mit den meisten Anfragen" icon={Clock} thresholdColor="blue" />
          </KPIGrid>
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">Zeitliche Verteilung</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><ChartSkeleton /><ChartSkeleton /></div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Anfragen nach Wochentag" subtitle="Verteilung ueber die Woche">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dayOfWeekData} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="germanLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" fill={chartColors[4]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Anfragen nach Tageszeit" subtitle="Verteilung ueber den Tag">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourOfDayData} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="germanLabel" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" fill={chartColors[5]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        ) : null}
      </section>
    </PageContainer>
  );
}
