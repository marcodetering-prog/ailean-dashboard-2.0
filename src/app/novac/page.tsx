"use client";

import { useMemo } from "react";
import {
  Ticket,
  AlertTriangle,
  ArrowUpCircle,
  Timer,
  Bug,
  BarChart3,
  Users,
  GitCompareArrows,
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
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { PageContainer } from "@/components/layout/page-container";
import { PlaceholderCard } from "@/components/shared/placeholder-card";
import {
  KPICardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw } from "@/lib/utils/formatting";
import {
  getInverseThresholdColor,
} from "@/lib/utils/thresholds";
import { chartColors } from "@/lib/constants/kpi-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

interface BuildingItem {
  address: string;
  count: number;
  escalated: number;
  escalationRate: number;
}

interface NovacData {
  totalTickets: number;
  firstEscalation: number;
  secondEscalation: number;
  topicBreakdown: BreakdownItem[];
  buildingBreakdown: BuildingItem[];
  avgProcessingDays: number;
  bugCount: number;
  bugRate: number;
  bugCategoryBreakdown: BreakdownItem[];
  escalationRatio: number;
  totalEvents: number;
  conversionRate: number;
}

// ---------------------------------------------------------------------------
// Tooltips
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

function renderPieLabel({
  label,
  percentage,
}: {
  label: string;
  percentage: number;
}): string {
  return label + " (" + percentage.toFixed(0) + "%)";
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function NovacPage() {
  const { data, isLoading, error } =
    useDashboardData<NovacData>("/api/novac");

  const buildingColumns = useMemo<ColumnDef<BuildingItem>[]>(
    () => [
      { key: "address", header: "Liegenschaft", accessor: (row) => row.address, sortable: true },
      { key: "count", header: "Tickets", accessor: (row) => row.count, align: "right", sortable: true },
      { key: "escalated", header: "Eskaliert", accessor: (row) => row.escalated, align: "right", sortable: true },
      {
        key: "escalationRate",
        header: "Eskalationsrate",
        accessor: (row) => row.escalationRate,
        render: (v) => (
          <span className={Number(v) > 50 ? "text-red-600 font-medium" : ""}>
            {formatPercentRaw(Number(v))}
          </span>
        ),
        align: "right",
        sortable: true,
      },
    ],
    []
  );

  const bugColumns = useMemo<ColumnDef<BreakdownItem>[]>(
    () => [
      { key: "label", header: "Bug-Kategorie", accessor: (row) => row.label, sortable: true },
      { key: "count", header: "Anzahl", accessor: (row) => row.count, align: "right", sortable: true },
      { key: "percentage", header: "%", accessor: (row) => row.percentage, render: (v) => formatPercentRaw(Number(v)), align: "right", sortable: true },
    ],
    []
  );

  return (
    <PageContainer
      title="NOVAC Review"
      description="NOVAC-spezifische KPIs #1-10 — Tickets, Eskalationen, Liegenschaften"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten.
        </div>
      )}

      {/* Hero KPIs: NOVAC #1, #2, #3, #6 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">NOVAC Ueberblick</h2>
        {isLoading ? (
          <KPIGrid columns={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : data ? (
          <KPIGrid columns={4}>
            <KPICard
              title="Versendete Tickets"
              value={formatNumber(data.totalTickets)}
              subtitle="NOVAC #1 — Mangeltickets gesamt"
              icon={Ticket}
              thresholdColor="blue"
            />
            <KPICard
              title="1. Eskalation"
              value={formatNumber(data.firstEscalation)}
              subtitle="NOVAC #2 — Status 6, 9, 12"
              icon={AlertTriangle}
              thresholdColor="amber"
            />
            <KPICard
              title="2. Eskalation (Head)"
              value={formatNumber(data.secondEscalation)}
              subtitle="NOVAC #3 — Status 11, 13, 14"
              icon={ArrowUpCircle}
              thresholdColor="red"
            />
            <KPICard
              title="Durchschn. Bearbeitungszeit"
              value={data.avgProcessingDays.toFixed(1) + " Tage"}
              subtitle="NOVAC #6 — Terminale Zustaende"
              icon={Timer}
              thresholdColor="blue"
            />
          </KPIGrid>
        ) : null}
      </section>

      {/* Second row: NOVAC #7, #9, #10 */}
      {!isLoading && data && (
        <section>
          <KPIGrid columns={3}>
            <KPICard
              title="Bug Rate"
              value={formatPercentRaw(data.bugRate)}
              subtitle={
                "NOVAC #7 — " + data.bugCount + " Bugs erkannt"
              }
              icon={Bug}
              thresholdColor={getInverseThresholdColor(
                data.bugRate,
                { green: 30, amber: 60 }
              )}
            />
            <KPICard
              title="Eskalationsverhaeltnis"
              value={
                data.escalationRatio === Infinity
                  ? "nur 1."
                  : data.escalationRatio.toFixed(2) + " : 1"
              }
              subtitle={
                "NOVAC #9 — " +
                data.firstEscalation +
                " extern vs. " +
                data.secondEscalation +
                " Head"
              }
              icon={GitCompareArrows}
              thresholdColor={data.escalationRatio < 1 ? "red" : "green"}
            />
            <KPICard
              title="AILEAN Konversionsrate"
              value={formatPercentRaw(data.conversionRate)}
              subtitle={
                "NOVAC #10 — " +
                data.totalTickets +
                " Tickets / " +
                data.totalEvents +
                " Events"
              }
              icon={Users}
              thresholdColor="blue"
            />
          </KPIGrid>
        </section>
      )}

      {/* NOVAC #4: Topic Distribution */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          NOVAC #4 — Themenverteilung
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Mangelkategorien"
              subtitle="Verteilung der Deficiency Types"
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={data.topicBreakdown}
                  margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
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

            {/* Bug Categories */}
            <ChartCard
              title="NOVAC #7 — Bug-Kategorien"
              subtitle="AI-erkannte Fehlertypen"
            >
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.bugCategoryBreakdown}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={renderPieLabel}
                    labelLine
                  >
                    {data.bugCategoryBreakdown.map((_, i) => (
                      <Cell
                        key={"bc-" + i}
                        fill={chartColors[i % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        ) : null}
      </section>

      {/* NOVAC #5: Per Building */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          NOVAC #5 — Verteilung nach Liegenschaften
        </h2>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : data?.buildingBreakdown ? (
          <DataTable
            data={data.buildingBreakdown}
            columns={buildingColumns}
            pageSize={10}
            emptyMessage="Keine Liegenschaftsdaten"
          />
        ) : null}
      </section>

      {/* Bug Category Table */}
      {!isLoading && data?.bugCategoryBreakdown && data.bugCategoryBreakdown.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            NOVAC #7 — Bug-Kategorien Detail
          </h2>
          <DataTable
            data={data.bugCategoryBreakdown}
            columns={bugColumns}
            pageSize={10}
            emptyMessage="Keine Bug-Daten"
          />
        </section>
      )}

      {/* NOVAC #8: Jotform - Coming Soon */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Weitere NOVAC KPIs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PlaceholderCard
            kpiNumber="NOVAC #8"
            title="Jotform-Weiterleitungen"
            status="coming-soon"
            description="Kein strukturiertes Tracking. 9 Erwaeh­nungen in Nachrichten gefunden. Erfordert AI-Algorithmus."
          />
        </div>
      </section>

      {/* Escalation Health Warning */}
      {!isLoading && data && data.escalationRatio < 1 && (
        <section>
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">
                  Eskalationsverhaeltnis ungesund
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Verhaeltnis 1. Eskalation zu 2. Eskalation: {data.escalationRatio.toFixed(2)}:1.
                  Es werden mehr Tickets an den Head of NOVAC ({data.secondEscalation}) eskaliert
                  als extern ({data.firstEscalation}) geloest. Das Verhaeltnis sollte umgekehrt sein.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </PageContainer>
  );
}
