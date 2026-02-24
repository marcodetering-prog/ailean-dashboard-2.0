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
} from "recharts";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { PageContainer } from "@/components/layout/page-container";
import { PlaceholderCard } from "@/components/shared/placeholder-card";
import {
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatPercentRaw } from "@/lib/utils/formatting";
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

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function StimmungPage() {
  const { data, isLoading, error } =
    useDashboardData<SummaryData>("/api/summary");

  const sentimentData = (data?.sentimentBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: getGermanLabel(item.label),
  }));

  const resolutionData = (data?.resolutionBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: getGermanLabel(item.label),
  }));

  const outcomeData = (data?.outcomeBreakdown ?? []).map((item) => ({
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

      {/* Under Construction & Coming Soon */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Weitere Stimmungs-KPIs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PlaceholderCard
            kpiNumber="KPI #33"
            title="Positiv zu Negativ Verlauf"
            status="under-construction"
            description="Erfordert Start/End-Stimmungserkennung pro Nachricht."
          />
          <PlaceholderCard
            kpiNumber="KPI #34"
            title="Negativ zu Positiv Verlauf"
            status="under-construction"
            description="Zeigt AILEAN-Faehigkeit, frustrierte Mieter umzustimmen."
          />
        </div>
      </section>

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
          <PlaceholderCard
            kpiNumber="KPI #41"
            title="Mail-Analyse"
            status="coming-soon"
            description="476 Berichte generiert, 367 an 24 Handwerker gesendet. Reporting-Pipeline noch aufzubauen."
          />
        </div>
      </section>
    </PageContainer>
  );
}
