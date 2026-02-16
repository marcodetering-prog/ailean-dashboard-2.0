"use client";

import { useMemo } from "react";
import {
  Bug,
  AlertTriangle,
  Eye,
  Layers,
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
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageContainer } from "@/components/layout/page-container";
import {
  KPICardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw, formatDate } from "@/lib/utils/formatting";
import {
  getInverseThresholdColor,
  inverseThresholds,
  type ThresholdColor,
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

interface BugSummaryData {
  totalBugs: number;
  bugRate: number;
  categoryBreakdown: BreakdownItem[];
  unreviewedCount: number;
  bugTrend: TrendItem[];
}

interface BugCluster {
  id: string;
  clusterLabel: string;
  bugCategory: string;
  eventCount: number;
  status: string;
  linearParentIssueId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

// ---------------------------------------------------------------------------
// Status color mapping
// ---------------------------------------------------------------------------

function getStatusColor(status: string): ThresholdColor {
  switch (status) {
    case "open":
      return "amber";
    case "in_sprint":
      return "blue";
    case "deferred":
      return "red";
    case "resolved":
      return "green";
    default:
      return "blue";
  }
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
      <p className="text-muted-foreground">Bugs: {payload[0].value}</p>
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

export default function BugTrackerPage() {
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
  } = useDashboardData<BugSummaryData>("/api/bugs/summary");

  const {
    data: clustersData,
    isLoading: clustersLoading,
    error: clustersError,
  } = useDashboardData<BugCluster[]>("/api/bugs/clusters");

  const isLoading = summaryLoading || clustersLoading;
  const error = summaryError || clustersError;

  // ---- Prepare chart data ----
  const categoryData = (summaryData?.categoryBreakdown ?? []).map((item) => ({
    ...item,
    germanLabel: getGermanLabel(item.label),
  }));

  const trendData = summaryData?.bugTrend ?? [];
  const clusters = clustersData ?? [];

  const distinctCategories = summaryData?.categoryBreakdown?.length ?? 0;

  // ---- Table columns ----
  const columns = useMemo<ColumnDef<BugCluster>[]>(
    () => [
      {
        key: "clusterLabel",
        header: "Cluster",
        accessor: (row) => row.clusterLabel,
        sortable: true,
      },
      {
        key: "bugCategory",
        header: "Kategorie",
        accessor: (row) => row.bugCategory,
        render: (value) => (
          <span>{getGermanLabel(String(value ?? ""))}</span>
        ),
        sortable: true,
      },
      {
        key: "eventCount",
        header: "Anzahl",
        accessor: (row) => row.eventCount,
        align: "right",
        sortable: true,
      },
      {
        key: "status",
        header: "Status",
        accessor: (row) => row.status,
        render: (value) => {
          const status = String(value ?? "open");
          return (
            <StatusBadge
              label={getGermanLabel(status)}
              color={getStatusColor(status)}
            />
          );
        },
        sortable: true,
      },
      {
        key: "linearParentIssueId",
        header: "Linear",
        accessor: (row) => row.linearParentIssueId,
        render: (value) => {
          if (!value) return <span className="text-muted-foreground">-</span>;
          const issueId = String(value);
          return (
            <a
              href={"https://linear.app/issue/" + issueId}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {issueId}
            </a>
          );
        },
      },
      {
        key: "lastSeenAt",
        header: "Zuletzt gesehen",
        accessor: (row) => row.lastSeenAt,
        render: (value) => (
          <span>{value ? formatDate(String(value)) : "-"}</span>
        ),
        sortable: true,
      },
    ],
    []
  );
  return (
    <PageContainer
      title="Bug Tracker"
      description="Uebersicht und Analyse erkannter AI-Fehler und Bug-Cluster"
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
          <KPIGrid columns={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : summaryData ? (
          <KPIGrid columns={4}>
            <KPICard
              title="Gesamte Bugs"
              value={formatNumber(summaryData.totalBugs)}
              subtitle="Erkannte Fehler insgesamt"
              icon={Bug}
              thresholdColor="blue"
            />

            <KPICard
              title="Bug Rate"
              value={formatPercentRaw(summaryData.bugRate)}
              subtitle="Anteil fehlerhafter Interaktionen"
              icon={AlertTriangle}
              thresholdColor={getInverseThresholdColor(
                summaryData.bugRate,
                inverseThresholds.bugRate
              )}
            />

            <KPICard
              title="Unueberprueft"
              value={formatNumber(summaryData.unreviewedCount)}
              subtitle="Noch nicht ueberpruefte Bugs"
              icon={Eye}
              thresholdColor={summaryData.unreviewedCount > 0 ? "amber" : "green"}
            />

            <KPICard
              title="Kategorien"
              value={formatNumber(distinctCategories)}
              subtitle="Verschiedene Bug-Kategorien"
              icon={Layers}
              thresholdColor="blue"
            />
          </KPIGrid>
        ) : null}
      </section>
      {/* Section 2: Charts */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Detailanalysen</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        ) : summaryData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bug Category Pie Chart */}
            <ChartCard
              title="Bug-Kategorien"
              subtitle="Verteilung nach Fehlerkategorie"
            >
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="count"
                    nameKey="germanLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={renderPieLabel}
                    labelLine
                  >
                    {categoryData.map((_, i) => (
                      <Cell
                        key={"cat-" + i}
                        fill={chartColors[i % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Bug Trend Area Chart */}
            <ChartCard
              title="Bug-Trend"
              subtitle="Entwicklung der Bug-Anzahl ueber Zeit"
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
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartColors[3]}
                    fill={chartColors[3]}
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        ) : null}
      </section>

      {/* Section 3: Bug Clusters Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Bug-Cluster</h2>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <DataTable<BugCluster>
            data={clusters}
            columns={columns}
            pageSize={10}
            emptyMessage="Keine Bug-Cluster vorhanden"
          />
        )}
      </section>
    </PageContainer>
  );
}
