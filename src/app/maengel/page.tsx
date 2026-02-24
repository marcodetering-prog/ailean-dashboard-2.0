"use client";

import {
  FileWarning,
  CheckCircle2,
  Timer,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { PageContainer } from "@/components/layout/page-container";
import {
  KPICardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw } from "@/lib/utils/formatting";
import { chartColors } from "@/lib/constants/kpi-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

interface ClosingTimeSummary {
  state: number;
  stateLabel: string;
  count: number;
  avgDays: number;
  minDays: number;
  maxDays: number;
}

interface DeficiencyData {
  totalDeficiencies: number;
  solvedCount: number;
  solvedPercent: number;
  categoryBreakdown: BreakdownItem[];
  monthlyTrend: { period: string; count: number }[];
  quarterlyTrend: { period: string; count: number }[];
  yearlyTrend: { period: string; count: number }[];
  closingTimeSummary: ClosingTimeSummary[];
  overallAvgClosingDays: number;
  stateBreakdown: (BreakdownItem & { stateId: number })[];
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Columns for closing time table
// ---------------------------------------------------------------------------

const closingTimeColumns: ColumnDef<ClosingTimeSummary>[] = [
  { key: "stateLabel", header: "Status", accessor: (row) => row.stateLabel, sortable: true },
  { key: "count", header: "Anzahl", accessor: (row) => row.count, align: "right", sortable: true },
  { key: "avgDays", header: "Durchschn. Tage", accessor: (row) => row.avgDays, render: (v) => Number(v).toFixed(1), align: "right", sortable: true },
  { key: "minDays", header: "Min. Tage", accessor: (row) => row.minDays, render: (v) => Number(v).toFixed(1), align: "right", sortable: true },
  { key: "maxDays", header: "Max. Tage", accessor: (row) => row.maxDays, render: (v) => Number(v).toFixed(1), align: "right", sortable: true },
];

// State distribution columns
const stateColumns: ColumnDef<BreakdownItem & { stateId: number }>[] = [
  { key: "label", header: "Status", accessor: (row) => row.label, sortable: true },
  { key: "count", header: "Anzahl", accessor: (row) => row.count, align: "right", sortable: true },
  { key: "percentage", header: "%", accessor: (row) => row.percentage, render: (v) => formatPercentRaw(Number(v)), align: "right", sortable: true },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function MaengelPage() {
  const { data, isLoading, error } =
    useDashboardData<DeficiencyData>("/api/deficiency");

  const categoryData = (data?.categoryBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: item.label,
  }));

  return (
    <PageContainer
      title="Maengel-Analyse"
      description="KPIs #18-24, #35 — Mangelkategorien, Zeitraeume, Bearbeitungszeit"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.
        </div>
      )}

      {/* Hero KPIs */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Ueberblick</h2>
        {isLoading ? (
          <KPIGrid columns={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : data ? (
          <KPIGrid columns={4}>
            <KPICard
              title="Gesamte Maengel"
              value={formatNumber(data.totalDeficiencies)}
              subtitle="KPI #18 — Gemeldete Maengel"
              icon={FileWarning}
              thresholdColor="blue"
            />
            <KPICard
              title="Geloest mit AILEAN"
              value={formatPercentRaw(data.solvedPercent)}
              subtitle={"KPI #20 — " + data.solvedCount + " geloest"}
              icon={CheckCircle2}
              thresholdColor="green"
            />
            <KPICard
              title="Durchschn. Schliesszeit"
              value={data.overallAvgClosingDays.toFixed(1) + " Tage"}
              subtitle="KPI #35 — Terminale Zustaende"
              icon={Timer}
              thresholdColor="blue"
            />
            <KPICard
              title="Kategorien"
              value={formatNumber(data.categoryBreakdown.length)}
              subtitle="KPI #18 — Verschiedene Mangeltypen"
              icon={TrendingUp}
              thresholdColor="blue"
            />
          </KPIGrid>
        ) : null}
      </section>

      {/* KPI #18: Category Breakdown */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPI #18 — Maengel nach Kategorie
        </h2>
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <ChartCard
            title="Mangelkategorien"
            subtitle="Bitmask-decodierte Deficiency Types"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={categoryData}
                margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="germanLabel"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  height={80}
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
        )}
      </section>

      {/* KPIs #21-24: Time Period Trends */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPIs #21-24 — Zeitraumanalyse
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="KPI #21 — Monatlich"
              subtitle="Maengel pro Monat"
            >
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.monthlyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Area type="monotone" dataKey="count" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="KPI #22 — Quartal"
              subtitle="Maengel pro Quartal"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.quarterlyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        ) : null}
      </section>

      {/* KPI #35: Closing Time */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          KPI #35 — Bearbeitungszeit nach Status
        </h2>
        {isLoading ? (
          <TableSkeleton rows={3} />
        ) : data?.closingTimeSummary ? (
          <DataTable
            data={data.closingTimeSummary}
            columns={closingTimeColumns}
            pageSize={10}
            emptyMessage="Keine Schliesszeiten vorhanden"
          />
        ) : null}
      </section>

      {/* State Distribution */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Statusverteilung</h2>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : data?.stateBreakdown ? (
          <DataTable
            data={data.stateBreakdown}
            columns={stateColumns}
            pageSize={20}
            emptyMessage="Keine Statusdaten vorhanden"
          />
        ) : null}
      </section>
    </PageContainer>
  );
}
