"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { TrendingDown, TrendingUp, Mail, Wrench } from "lucide-react";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { PageContainer } from "@/components/layout/page-container";
import { PlaceholderCard } from "@/components/shared/placeholder-card";
import {
  KPICardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw } from "@/lib/utils/formatting";
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

interface SummaryData {
  totalEvents: number;
  sentimentBreakdown: BreakdownItem[];
  outcomeBreakdown: BreakdownItem[];
  resolutionBreakdown: BreakdownItem[];
}

interface StimmungData {
  positiveToNegative: number;
  positiveToNegativeRate: number;
  negativeToPositive: number;
  negativeToPositiveRate: number;
  totalMultiEventTenants: number;
  sentimentTransitions: Array<{ from: string; to: string; count: number }>;
  reportsGenerated: number;
  reportsSent: number;
  uniqueCraftsmen: number;
  totalCraftsmen: number;
  craftsmanBreakdown: BreakdownItem[];
  tradeBreakdown: BreakdownItem[];
  monthlyMailVolume: Array<{ period: string; count: number }>;
}

// ---------------------------------------------------------------------------
// Tooltips
// ---------------------------------------------------------------------------

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">Anzahl: {payload[0].value}</p>
    </div>
  );
}

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
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
// Table columns
// ---------------------------------------------------------------------------

const sentimentColumns: ColumnDef<BreakdownItem & { germanLabel: string }>[] = [
  { key: "germanLabel", header: "Stimmung", accessor: (row) => row.germanLabel, sortable: true },
  { key: "count", header: "Anzahl", accessor: (row) => row.count, align: "right", sortable: true },
  { key: "percentage", header: "%", accessor: (row) => row.percentage, render: (v) => formatPercentRaw(Number(v)), align: "right", sortable: true },
];

const transitionColumns: ColumnDef<{ from: string; to: string; count: number }>[] = [
  { key: "from", header: "Von", accessor: (row) => getGermanLabel(row.from), sortable: true },
  { key: "to", header: "Zu", accessor: (row) => getGermanLabel(row.to), sortable: true },
  { key: "count", header: "Anzahl", accessor: (row) => row.count, align: "right", sortable: true },
];

const craftsmanColumns: ColumnDef<BreakdownItem>[] = [
  { key: "label", header: "Firma", accessor: (row) => row.label, sortable: true },
  { key: "count", header: "Auftraege", accessor: (row) => row.count, align: "right", sortable: true },
  { key: "percentage", header: "%", accessor: (row) => row.percentage, render: (v) => formatPercentRaw(Number(v)), align: "right", sortable: true },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function StimmungPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } =
    useDashboardData<SummaryData>("/api/summary");
  const { data: stimmung, isLoading: stimmungLoading } =
    useDashboardData<StimmungData>("/api/stimmung");

  const isLoading = summaryLoading || stimmungLoading;
  const error = summaryError;

  const sentimentData = (summary?.sentimentBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: getGermanLabel(item.label),
  }));

  const resolutionData = (summary?.resolutionBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: getGermanLabel(item.label),
  }));

  const outcomeData = (summary?.outcomeBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: getGermanLabel(item.label),
  }));

  return (
    <PageContainer
      title="Stimmung & Mieter"
      description="KPIs #31-34, #37-41 — Stimmungsanalyse, Nutzerfeedback, Analytics"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten.
        </div>
      )}

      {/* KPIs #31-32: Sentiment Distribution */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPI #31-32 — Stimmungsverteilung
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <TableSkeleton rows={8} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Stimmungsverteilung"
              subtitle="8 Stimmungskategorien (AI-bewertet)"
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    dataKey="count"
                    nameKey="germanLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
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

            <div>
              <DataTable
                data={sentimentData}
                columns={sentimentColumns}
                pageSize={10}
                emptyMessage="Keine Stimmungsdaten"
              />
            </div>
          </div>
        )}
      </section>

      {/* Resolution Methods & Outcomes */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Loesungsmethoden & Ergebnisse
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Loesungsmethoden"
              subtitle="Wie Anfragen geloest wurden"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={resolutionData} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="germanLabel" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Ergebnisverteilung"
              subtitle="Event Outcomes"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={outcomeData} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="germanLabel" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" fill={chartColors[4]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </section>

      {/* KPIs #33/#34: Sentiment Arcs */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPI #33-34 — Stimmungsverlaeufe
        </h2>
        {isLoading ? (
          <KPIGrid columns={3}>
            {Array.from({ length: 3 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : stimmung ? (
          <>
            <KPIGrid columns={3}>
              <KPICard
                title="Positiv zu Negativ"
                value={String(stimmung.positiveToNegative)}
                subtitle={
                  "KPI #33 — " +
                  formatPercentRaw(stimmung.positiveToNegativeRate) +
                  " der Mehrfach-Mieter"
                }
                icon={TrendingDown}
                thresholdColor={stimmung.positiveToNegativeRate > 10 ? "red" : "green"}
              />
              <KPICard
                title="Negativ zu Positiv"
                value={String(stimmung.negativeToPositive)}
                subtitle={
                  "KPI #34 — " +
                  formatPercentRaw(stimmung.negativeToPositiveRate) +
                  " der Mehrfach-Mieter"
                }
                icon={TrendingUp}
                thresholdColor={stimmung.negativeToPositiveRate > 5 ? "green" : "amber"}
              />
              <KPICard
                title="Mehrfach-Mieter analysiert"
                value={formatNumber(stimmung.totalMultiEventTenants)}
                subtitle="Mieter mit 2+ Interaktionen fuer Verlaufsanalyse"
                thresholdColor="blue"
              />
            </KPIGrid>

            {/* Sentiment Transition Table */}
            {stimmung.sentimentTransitions.length > 0 && (
              <div className="mt-4">
                <DataTable
                  data={stimmung.sentimentTransitions}
                  columns={transitionColumns}
                  pageSize={10}
                  emptyMessage="Keine Uebergangsdaten"
                />
              </div>
            )}
          </>
        ) : null}
      </section>

      {/* KPI #41: Mail Analytics */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPI #41 — Mail-Analyse / Handwerker-Reports
        </h2>
        {isLoading ? (
          <>
            <KPIGrid columns={4}>
              {Array.from({ length: 4 }).map((_, i) => (
                <KPICardSkeleton key={i} />
              ))}
            </KPIGrid>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartSkeleton />
              <TableSkeleton rows={5} />
            </div>
          </>
        ) : stimmung ? (
          <>
            <KPIGrid columns={4}>
              <KPICard
                title="Berichte generiert"
                value={formatNumber(stimmung.reportsGenerated)}
                subtitle="Deficiency Reports erstellt"
                icon={Mail}
                thresholdColor="blue"
              />
              <KPICard
                title="An Handwerker gesendet"
                value={formatNumber(stimmung.reportsSent)}
                subtitle={
                  formatPercentRaw(
                    stimmung.reportsGenerated > 0
                      ? (stimmung.reportsSent / stimmung.reportsGenerated) * 100
                      : 0
                  ) + " Versandquote"
                }
                icon={Wrench}
                thresholdColor="green"
              />
              <KPICard
                title="Unique Handwerker"
                value={formatNumber(stimmung.uniqueCraftsmen)}
                subtitle={"Von " + stimmung.totalCraftsmen + " registrierten Handwerkern"}
                icon={Wrench}
                thresholdColor="blue"
              />
              <KPICard
                title="Handwerker-Firmen"
                value={formatNumber(stimmung.craftsmanBreakdown.length)}
                subtitle="Verschiedene Firmen"
                icon={Wrench}
                thresholdColor="blue"
              />
            </KPIGrid>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Monthly mail volume chart */}
              {stimmung.monthlyMailVolume.length > 0 && (
                <ChartCard
                  title="Monatliches Versandvolumen"
                  subtitle="An Handwerker gesendete Auftraege pro Monat"
                >
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                      data={stimmung.monthlyMailVolume}
                      margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={chartColors[1]}
                        fill={chartColors[1]}
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Craftsman company breakdown */}
              {stimmung.craftsmanBreakdown.length > 0 && (
                <div>
                  <DataTable
                    data={stimmung.craftsmanBreakdown}
                    columns={craftsmanColumns}
                    pageSize={10}
                    emptyMessage="Keine Handwerkerdaten"
                  />
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>

      {/* Coming Soon: FAIL KPIs */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Nutzerstatistiken
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PlaceholderCard
            kpiNumber="KPI #37"
            title="Maengel nach Demografie"
            status="coming-soon"
            description="Keine demografischen Daten vorhanden (Geburtsdatum, Geschlecht)."
          />
          <PlaceholderCard
            kpiNumber="KPI #38"
            title="Bewertung von AILEAN"
            status="coming-soon"
            description="Kein Bewertungsmechanismus vorhanden. Vorschlag: AI-Scoring."
          />
          <PlaceholderCard
            kpiNumber="KPI #39"
            title="Feedback-Sammlung"
            status="coming-soon"
            description="Abhaengig von KPI #38. AI kann Fehlergruende aus Gespraechen extrahieren."
          />
        </div>
      </section>
    </PageContainer>
  );
}
