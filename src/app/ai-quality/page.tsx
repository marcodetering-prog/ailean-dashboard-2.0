"use client";

import {
  Brain,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
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
import { PageContainer } from "@/components/layout/page-container";
import {
  KPICardSkeleton,
  ChartSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatPercentRaw } from "@/lib/utils/formatting";
import {
  getThresholdColor,
  getInverseThresholdColor,
  thresholds,
  inverseThresholds,
} from "@/lib/utils/thresholds";
import { getGermanLabel } from "@/lib/utils/german-labels";
import { chartColors } from "@/lib/constants/kpi-config";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

interface TrendItem {
  period: string;
  value: number;
}

interface AIQualityData {
  avgQualityScore: number;
  qualityScoreDistribution: BreakdownItem[];
  loopRate: number;
  loopCount: number;
  misunderstandingRate: number;
  misunderstandingCount: number;
  correctTriageRate: number;
  avgUnnecessaryQuestions: number;
  sentimentBreakdown: BreakdownItem[];
  resolutionBreakdown: BreakdownItem[];
  qualityTrend: TrendItem[];
}

// ---------------------------------------------------------------------------
// Helper: translate breakdown labels to German
// ---------------------------------------------------------------------------

function translateBreakdown(
  items: BreakdownItem[] | undefined
): (BreakdownItem & { germanLabel: string })[] {
  if (!items) return [];
  return items.map((item) => ({
    ...item,
    germanLabel: getGermanLabel(item.label),
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

function CustomAreaTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">Score: {payload[0].value}</p>
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

export default function AiQualityPage() {
  const { data, isLoading, error } =
    useDashboardData<AIQualityData>("/api/ai-quality");

  // ---- Prepare chart data ----
  const histogramData = (data?.qualityScoreDistribution ?? []).map((item) => ({
    ...item,
    germanLabel: "Score " + item.label,
  }));

  const trendData = data?.qualityTrend ?? [];

  const sentimentData = translateBreakdown(data?.sentimentBreakdown);
  const resolutionData = translateBreakdown(data?.resolutionBreakdown);

  return (
    <PageContainer
      title="AI Qualitaet"
      description="Detaillierte Analyse der AI-Antwortqualitaet und Fehlermetriken"
    >
      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.
        </div>
      )}

      {/* Section 1: KPI Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Wichtigste Kennzahlen</h2>
        {isLoading ? (
          <>
            <KPIGrid columns={3}>
              {Array.from({ length: 3 }).map((_, i) => (
                <KPICardSkeleton key={i} />
              ))}
            </KPIGrid>
            <KPIGrid columns={2} className="mt-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <KPICardSkeleton key={i} />
              ))}
            </KPIGrid>
          </>
        ) : data ? (
          <>
            <KPIGrid columns={3}>
              <KPICard
                title="AI Qualitaetsscore"
                value={data.avgQualityScore.toFixed(1) + "/5"}
                subtitle="Durchschnittliche Bewertung"
                icon={Brain}
                thresholdColor={getThresholdColor(
                  data.avgQualityScore,
                  thresholds.aiQualityScore
                )}
              />

              <KPICard
                title="Loop Rate"
                value={formatPercentRaw(data.loopRate)}
                subtitle={data.loopCount + " Schleifen erkannt"}
                icon={RefreshCw}
                thresholdColor={getInverseThresholdColor(
                  data.loopRate,
                  inverseThresholds.loopRate
                )}
              />

              <KPICard
                title="Missverstaendnisrate"
                value={formatPercentRaw(data.misunderstandingRate)}
                subtitle={data.misunderstandingCount + " Missverstaendnisse"}
                icon={AlertTriangle}
                thresholdColor={getInverseThresholdColor(
                  data.misunderstandingRate,
                  inverseThresholds.misunderstandingRate
                )}
              />
            </KPIGrid>

            <KPIGrid columns={2} className="mt-4">
              <KPICard
                title="Korrekte Triage"
                value={formatPercentRaw(data.correctTriageRate)}
                subtitle="Richtig zugeordnete Anfragen"
                icon={CheckCircle}
                thresholdColor={getThresholdColor(
                  data.correctTriageRate,
                  thresholds.correctTriageRate
                )}
              />

              <KPICard
                title="Unnoetige Fragen"
                value={data.avgUnnecessaryQuestions.toFixed(2)}
                subtitle="Durchschnitt pro Gespraech"
                icon={HelpCircle}
                thresholdColor={getInverseThresholdColor(
                  data.avgUnnecessaryQuestions,
                  inverseThresholds.avgUnnecessaryQuestions
                )}
              />
            </KPIGrid>
          </>
        ) : null}
      </section>
      {/* Section 2: Charts */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Detailanalysen</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quality Score Histogram */}
            <ChartCard
              title="Qualitaetsscore Verteilung"
              subtitle="Histogramm der Bewertungen (Score 1-5)"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={histogramData}
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
                    fill={chartColors[0]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Quality Trend Area Chart */}
            <ChartCard
              title="Qualitaetstrend"
              subtitle="Entwicklung des Qualitaetsscores ueber Zeit"
            >
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 5]}
                    allowDecimals
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartColors[0]}
                    fill={chartColors[0]}
                    fillOpacity={0.2}
                  />
                </AreaChart>
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

            {/* Resolution Breakdown Bar Chart */}
            <ChartCard
              title="Loesungsmethoden"
              subtitle="Wie Anfragen geloest wurden"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={resolutionData}
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
          </div>
        ) : null}
      </section>
    </PageContainer>
  );
}
