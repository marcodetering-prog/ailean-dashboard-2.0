"use client";

import {
  FileWarning,
  CheckCircle2,
  Clock,
  Timer,
  Users,
  Bug,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { PipelineBar } from "@/components/shared/pipeline-bar";
import { PageContainer } from "@/components/layout/page-container";
import {
  KPICardSkeleton,
  ChartSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw } from "@/lib/utils/formatting";
import {
  getInverseThresholdColor,
  inverseThresholds,
} from "@/lib/utils/thresholds";
import {
  getGermanLabel,
  stateCategories,
} from "@/lib/utils/german-labels";
import { chartColors } from "@/lib/constants/kpi-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

interface SummaryData {
  totalEvents: number;
  totalWithDeficiencyReport: number;
  deficiencyReportRate: number;
  avgAiQualityScore: number;
  loopDetectionRate: number;
  bugRate: number;
  automationRate: number;
  avgFirstResponseSec: number;
  avgDurationMin: number;
  sentimentBreakdown: BreakdownItem[];
  categoryBreakdown: BreakdownItem[];
  stateBreakdown: (BreakdownItem & { category?: string })[];
  businessHoursBreakdown: BreakdownItem[];
}

interface DeficiencyData {
  totalDeficiencies: number;
  solvedCount: number;
  solvedPercent: number;
  overallAvgClosingDays: number;
  categoryBreakdown: BreakdownItem[];
  monthlyTrend: { period: string; count: number }[];
  stateBreakdown: (BreakdownItem & { stateId: number })[];
}

// ---------------------------------------------------------------------------
// Tooltips
// ---------------------------------------------------------------------------

interface TooltipPayload {
  value: number;
  name: string;
}

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">Anzahl: {payload[0].value}</p>
    </div>
  );
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">Anzahl: {payload[0].value}</p>
    </div>
  );
}

function renderPieLabel({
  germanLabel,
  percentage,
}: {
  germanLabel: string;
  percentage: number;
}): string {
  return germanLabel + " (" + percentage.toFixed(0) + "%)";
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function UebersichtPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } =
    useDashboardData<SummaryData>("/api/summary");
  const { data: deficiency, isLoading: defLoading } =
    useDashboardData<DeficiencyData>("/api/deficiency");

  const isLoading = summaryLoading || defLoading;

  const sentimentData = (summary?.sentimentBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: getGermanLabel(item.label),
  }));

  const categoryData = (deficiency?.categoryBreakdown ?? summary?.categoryBreakdown ?? []).map(
    (item) => ({
      ...item,
      germanLabel: getGermanLabel(item.label),
    })
  );

  const monthlyData = deficiency?.monthlyTrend ?? [];

  const pipelineSegments = (deficiency?.stateBreakdown ?? summary?.stateBreakdown ?? []).map(
    (s) => ({
      label:
        "category" in s && s.category && s.category in stateCategories
          ? stateCategories[s.category as keyof typeof stateCategories]
          : s.label,
      count: s.count,
    })
  );

  const automationDisplay =
    summary != null
      ? summary.automationRate <= 1
        ? summary.automationRate * 100
        : summary.automationRate
      : 0;

  return (
    <PageContainer
      title="Uebersicht"
      description="Zentrale KPI-Uebersicht — AILEAN Dashboard"
    >
      {summaryError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.
        </div>
      )}

      {/* Section 1: Hero KPI Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Wichtigste Kennzahlen</h2>
        {isLoading ? (
          <KPIGrid columns={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : (
          <KPIGrid columns={3}>
            <KPICard
              title="Gesamte Maengel"
              value={formatNumber(deficiency?.totalDeficiencies ?? 0)}
              subtitle={
                (summary?.totalEvents ?? 0) + " Gesamt-Anfragen (alle Typen)"
              }
              icon={FileWarning}
              thresholdColor="blue"
              drillDownHref="/maengel"
            />

            <KPICard
              title="Geloest mit AILEAN"
              value={formatPercentRaw(deficiency?.solvedPercent ?? 0)}
              subtitle={
                "KPI #20 — " +
                (deficiency?.solvedCount ?? 0) +
                " von " +
                (deficiency?.totalDeficiencies ?? 0) +
                " Maengeln"
              }
              icon={CheckCircle2}
              thresholdColor="green"
              drillDownHref="/maengel"
            />

            <KPICard
              title="Durchschn. Schliesszeit"
              value={
                (deficiency?.overallAvgClosingDays ?? 0).toFixed(1) + " Tage"
              }
              subtitle="KPI #35 — Durchschnittliche Bearbeitungszeit"
              icon={Timer}
              thresholdColor="blue"
              drillDownHref="/maengel"
            />

            <KPICard
              title="Automatisierungsrate"
              value={formatPercentRaw(automationDisplay)}
              subtitle="Anteil vollautomatisierter Anfragen"
              icon={Clock}
              thresholdColor="blue"
              drillDownHref="/ai-performance"
            />

            <KPICard
              title="Bug Rate"
              value={formatPercentRaw(summary?.bugRate ?? 0)}
              subtitle="ADD-15 — Anteil fehlerhafter Interaktionen"
              icon={Bug}
              thresholdColor={getInverseThresholdColor(
                summary?.bugRate ?? 0,
                inverseThresholds.bugRate
              )}
              drillDownHref="/ai-performance"
            />

            <KPICard
              title="Gesamt-Anfragen"
              value={formatNumber(summary?.totalEvents ?? 0)}
              subtitle={
                (summary?.totalWithDeficiencyReport ?? 0) +
                " mit Mangelbericht"
              }
              icon={Users}
              thresholdColor="blue"
              drillDownHref="/berichte"
            />
          </KPIGrid>
        )}
      </section>

      {/* Section 2: Pipeline */}
      {!isLoading && pipelineSegments.length > 0 && (
        <section>
          <ChartCard title="Mangel-Pipeline" subtitle="Verteilung nach Status">
            <PipelineBar segments={pipelineSegments} />
          </ChartCard>
        </section>
      )}

      {isLoading && (
        <section>
          <ChartSkeleton height="h-20" />
        </section>
      )}

      {/* Section 3: Charts */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Detailanalysen</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* KPI #18: Deficiency Categories */}
            <ChartCard
              title="KPI #18 — Mangelkategorien"
              subtitle="Verteilung nach Kategorie (Bitmask)"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={categoryData}
                  margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="germanLabel"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={chartColors[0]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* KPIs #31-32: Sentiment */}
            <ChartCard
              title="KPI #31-32 — Stimmungsverteilung"
              subtitle="Mieterstimmung nach Kategorie"
            >
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    dataKey="count"
                    nameKey="germanLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={renderPieLabel}
                    labelLine
                  >
                    {sentimentData.map((_, i) => (
                      <Cell
                        key={"s-" + i}
                        fill={chartColors[i % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* KPI #21: Monthly Trend */}
            <ChartCard
              title="KPI #21 — Monatlicher Trend"
              subtitle="Maengel pro Monat"
            >
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={chartColors[0]}
                    fill={chartColors[0]}
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Business Hours */}
            <ChartCard
              title="Geschaeftszeiten"
              subtitle="Innerhalb vs. ausserhalb der Buerozeiten"
            >
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={(summary?.businessHoursBreakdown ?? []).map((b) => ({
                      ...b,
                      germanLabel:
                        b.label === "inside"
                          ? "Innerhalb"
                          : b.label === "outside"
                          ? "Ausserhalb"
                          : getGermanLabel(b.label),
                    }))}
                    dataKey="count"
                    nameKey="germanLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={renderPieLabel}
                    labelLine
                  >
                    <Cell fill={chartColors[0]} />
                    <Cell fill={chartColors[2]} />
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </section>
    </PageContainer>
  );
}
