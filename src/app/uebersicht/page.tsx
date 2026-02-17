"use client";

import {
  MessageSquare,
  FileText,
  Brain,
  Zap,
  RefreshCw,
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
  getThresholdColor,
  getInverseThresholdColor,
  thresholds,
  inverseThresholds,
} from "@/lib/utils/thresholds";
import {
  getGermanLabel,
  stateCategories,
  dayOfWeekShortLabels,
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

interface HourBreakdownItem {
  label: string | number;
  count: number;
  percentage: number;
}

interface DayBreakdownItem {
  label: string | number;
  count: number;
  percentage: number;
}

interface StateBreakdownItem {
  label: string;
  count: number;
  percentage: number;
  category?: string;
}

interface SummaryData {
  totalEvents: number;
  totalWithDeficiencyReport: number;
  deficiencyReportRate: number;
  avgAiQualityScore: number;
  avgTenantEffort: number;
  loopDetectionRate: number;
  misunderstandingRate: number;
  bugRate: number;
  correctTriageRate: number;
  avgUnnecessaryQuestions: number;
  urgencyRate: number;
  automationRate: number;
  avgFirstResponseSec: number;
  avgDurationMin: number;
  agentTakeoverRate: number;
  sentimentBreakdown: BreakdownItem[];
  severityBreakdown: BreakdownItem[];
  categoryBreakdown: BreakdownItem[];
  resolutionBreakdown: BreakdownItem[];
  intentBreakdown: BreakdownItem[];
  outcomeBreakdown: BreakdownItem[];
  inquiryTypeBreakdown: BreakdownItem[];
  stateBreakdown: StateBreakdownItem[];
  businessHoursBreakdown: BreakdownItem[];
  dayOfWeekBreakdown: DayBreakdownItem[];
  hourOfDayBreakdown: HourBreakdownItem[];
}

// ---------------------------------------------------------------------------
// Helper: translate breakdown labels to German
// ---------------------------------------------------------------------------

function translateBreakdown<T extends { label: string | number }>(
  items: T[] | undefined
): (T & { germanLabel: string })[] {
  if (!items) return [];
  return items.map((item) => ({
    ...item,
    germanLabel:
      typeof item.label === "number"
        ? String(item.label)
        : getGermanLabel(item.label),
  }));
}

function translateDayOfWeekBreakdown(
  items: DayBreakdownItem[] | undefined
): (DayBreakdownItem & { germanLabel: string })[] {
  if (!items) return [];
  return items.map((item) => ({
    ...item,
    germanLabel:
      dayOfWeekShortLabels[Number(item.label)] ?? String(item.label),
  }));
}

// ---------------------------------------------------------------------------
// Custom Recharts tooltips
// ---------------------------------------------------------------------------

interface CustomTooltipPayload {
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
  label?: string;
}

function CustomBarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">Anzahl: {payload[0].value}</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{entry.name}</p>
      <p className="text-muted-foreground">Anzahl: {entry.value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pie label renderer
// ---------------------------------------------------------------------------

interface PieLabelProps {
  germanLabel: string;
  percentage: number;
}

function renderPieLabel({ germanLabel, percentage }: PieLabelProps): string {
  return germanLabel + " (" + percentage.toFixed(0) + "%)";
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function UebersichtPage() {
  const { data, isLoading, error } =
    useDashboardData<SummaryData>("/api/summary");

  // ---- Prepare chart data ----
  const categoryData = translateBreakdown(data?.categoryBreakdown);
  const sentimentData = translateBreakdown(data?.sentimentBreakdown);
  const resolutionData = translateBreakdown(data?.resolutionBreakdown);
  const businessHoursData = translateBreakdown(data?.businessHoursBreakdown);
  const dayOfWeekData = translateDayOfWeekBreakdown(data?.dayOfWeekBreakdown);
  const hourOfDayData = (data?.hourOfDayBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: String(item.label).padStart(2, "0") + ":00",
  }));

  // ---- Pipeline segments ----
  const pipelineSegments = (data?.stateBreakdown ?? []).map((s) => ({
    label:
      s.category && s.category in stateCategories
        ? stateCategories[s.category as keyof typeof stateCategories]
        : getGermanLabel(s.label),
    count: s.count,
    category: s.category,
  }));

  // ---- Automation rate: API returns 0-1, convert to percentage ----
  const automationRateDisplay =
    data != null
      ? data.automationRate <= 1
        ? data.automationRate * 100
        : data.automationRate
      : 0;

  return (
    <PageContainer
      title="Uebersicht"
      description="Zentrale KPI-Uebersicht aller AILEAN Chatbot-Metriken"
    >
      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.
        </div>
      )}

      {/* Section 1: Hero KPI Cards (3x2 grid) */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Wichtigste Kennzahlen</h2>
        {isLoading ? (
          <KPIGrid columns={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : data ? (
          <KPIGrid columns={3}>
            <KPICard
              title="Gesamte Anfragen"
              value={formatNumber(data.totalEvents)}
              subtitle={data.totalWithDeficiencyReport + " mit Mangelbericht"}
              icon={MessageSquare}
              thresholdColor="blue"
              drillDownHref="/insights"
            />

            <KPICard
              title="Maengelberichte"
              value={formatPercentRaw(data.deficiencyReportRate)}
              subtitle={
                data.totalWithDeficiencyReport +
                " von " +
                data.totalEvents +
                " Anfragen"
              }
              icon={FileText}
              thresholdColor={getThresholdColor(
                data.deficiencyReportRate,
                thresholds.deficiencyReportRate
              )}
              drillDownHref="/handwerker"
            />

            <KPICard
              title="AI Qualitaetsscore"
              value={data.avgAiQualityScore.toFixed(1) + "/10"}
              subtitle="Durchschnittliche Bewertung (Skala 1-10)"
              icon={Brain}
              thresholdColor={getThresholdColor(
                data.avgAiQualityScore,
                thresholds.aiQualityScore
              )}
              drillDownHref="/ai-quality"
            />

            <KPICard
              title="Automatisierungsrate"
              value={formatPercentRaw(automationRateDisplay)}
              subtitle="Anteil vollautomatisierter Anfragen"
              icon={Zap}
              thresholdColor={getThresholdColor(
                data.automationRate,
                thresholds.automationRate
              )}
              drillDownHref="/insights"
            />

            <KPICard
              title="Loop Rate"
              value={formatPercentRaw(data.loopDetectionRate)}
              subtitle="Wiederholte Schleifen erkannt"
              icon={RefreshCw}
              thresholdColor={getInverseThresholdColor(
                data.loopDetectionRate,
                inverseThresholds.loopRate
              )}
              drillDownHref="/ai-quality"
            />

            <KPICard
              title="Bug Rate"
              value={formatPercentRaw(data.bugRate)}
              subtitle="Anteil fehlerhafter Interaktionen"
              icon={Bug}
              thresholdColor={getInverseThresholdColor(
                data.bugRate,
                inverseThresholds.bugRate
              )}
              drillDownHref="/bug-tracker"
            />
          </KPIGrid>
        ) : null}
      </section>

      {/* Section 2: Pipeline Bar */}
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

      {/* Section 3: Charts (2-column grid) */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Detailanalysen</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Deficiency Category Bar Chart */}
            <ChartCard
              title="Mangelkategorien"
              subtitle="Verteilung nach Kategorie"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={categoryData}
                  layout="horizontal"
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

            {/* Sentiment Pie Chart */}
            <ChartCard
              title="Stimmungsverteilung"
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
                        key={"sentiment-" + i}
                        fill={chartColors[i % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Resolution Method Bar Chart */}
            <ChartCard
              title="Loesungsmethoden"
              subtitle="Wie Anfragen geloest wurden"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={resolutionData}
                  layout="horizontal"
                  margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="germanLabel"
                    tick={{ fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={chartColors[1]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Business Hours Pie Chart */}
            <ChartCard
              title="Geschaeftszeiten"
              subtitle="Anfragen innerhalb vs. ausserhalb der Geschaeftszeiten"
            >
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={businessHoursData}
                    dataKey="count"
                    nameKey="germanLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={renderPieLabel}
                    labelLine
                  >
                    {businessHoursData.map((_, i) => (
                      <Cell
                        key={"bh-" + i}
                        fill={chartColors[i % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Day of Week Bar Chart */}
            <ChartCard
              title="Wochentage"
              subtitle="Anfragen nach Wochentag"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={dayOfWeekData}
                  layout="horizontal"
                  margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="germanLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={chartColors[4]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Hour of Day Bar Chart */}
            <ChartCard
              title="Tageszeit"
              subtitle="Anfragen nach Uhrzeit"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={hourOfDayData}
                  layout="horizontal"
                  margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="germanLabel"
                    tick={{ fontSize: 10 }}
                    interval={1}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={chartColors[5]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        ) : null}
      </section>
    </PageContainer>
  );
}
