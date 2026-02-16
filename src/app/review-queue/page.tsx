"use client";

import { useMemo } from "react";
import { ClipboardCheck, CheckCircle, PenTool } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { KPICard, KPIGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageContainer } from "@/components/layout/page-container";
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton";
import { formatNumber, formatDate } from "@/lib/utils/formatting";
import { getGermanLabel } from "@/lib/utils/german-labels";
import { chartColors } from "@/lib/constants/kpi-config";
import { getSentimentColor } from "@/lib/utils/thresholds";
import type { ThresholdColor } from "@/lib/utils/thresholds";

interface ReviewStats {
  pendingReviews: number;
  autoApproved: number;
  totalCorrections: number;
  correctionsByField: { label: string; count: number; percentage: number }[];
  incorporationRate: number;
}

interface QueueItem {
  conversationId: string;
  inquirySequence: number;
  reviewStatus: string;
  eventSummary: string | null;
  deficiencyCategory: string | null;
  aiQualityScore: number | null;
  tenantSentiment: string | null;
  isBug: boolean | null;
  bugCategory: string | null;
  aiLoopDetected: boolean | null;
  aiMisunderstood: boolean | null;
  resolutionMethod: string | null;
  startedAt: string | null;
  brand: string | null;
}

function qualityColor(score: number | null): ThresholdColor {
  if (score == null) return "blue";
  if (score >= 4) return "green";
  if (score >= 3) return "amber";
  return "red";
}

function truncate(text: string | null, max: number): string {
  if (!text) return "-";
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

interface TooltipPayload { value: number; name: string; }
interface TooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string; }

function CustomBarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">Anzahl: {payload[0].value}</p>
    </div>
  );
}

export default function ReviewQueuePage() {
  const { data: stats, isLoading: statsLoading, error: statsError } =
    useDashboardData<ReviewStats>("/api/review/stats");
  const { data: queue, isLoading: queueLoading, error: queueError } =
    useDashboardData<QueueItem[]>("/api/review/queue");
  const isLoading = statsLoading || queueLoading;
  const error = statsError || queueError;

  const correctionsData = useMemo(() => {
    if (!stats?.correctionsByField) return [];
    return stats.correctionsByField.map((item) => ({
      ...item,
      germanLabel: getGermanLabel(item.label),
    }));
  }, [stats]);

  const columns = useMemo<ColumnDef<QueueItem>[]>(
    () => [
      {
        key: "startedAt",
        header: "Datum",
        accessor: (row) => row.startedAt,
        render: (value) => (value ? formatDate(String(value)) : "-"),
        sortable: true,
      },
      {
        key: "eventSummary",
        header: "Zusammenfassung",
        accessor: (row) => row.eventSummary,
        render: (value) => (
          <span title={value ? String(value) : ""}>
            {truncate(value as string | null, 80)}
          </span>
        ),
        className: "max-w-[300px]",
      },
      {
        key: "deficiencyCategory",
        header: "Kategorie",
        accessor: (row) => row.deficiencyCategory,
        render: (value) => (value ? getGermanLabel(String(value)) : "-"),
        sortable: true,
      },
      {
        key: "aiQualityScore",
        header: "Qualitaet",
        accessor: (row) => row.aiQualityScore,
        render: (value, row) => (
          <StatusBadge
            label={row.aiQualityScore != null ? String(row.aiQualityScore) + "/5" : "-"}
            color={qualityColor(row.aiQualityScore)}
          />
        ),
        align: "center" as const,
        sortable: true,
      },
      {
        key: "tenantSentiment",
        header: "Stimmung",
        accessor: (row) => row.tenantSentiment,
        render: (value, row) =>
          row.tenantSentiment ? (
            <StatusBadge
              label={getGermanLabel(row.tenantSentiment)}
              color={getSentimentColor(row.tenantSentiment)}
            />
          ) : ("-"),
        align: "center" as const,
      },
      {
        key: "isBug",
        header: "Bug",
        accessor: (row) => row.isBug,
        render: (value) => (
          <StatusBadge label={value ? "Ja" : "Nein"} color={value ? "red" : "green"} />
        ),
        align: "center" as const,
      },
      {
        key: "brand",
        header: "Marke",
        accessor: (row) => row.brand,
        render: (value) => (value ? getGermanLabel(String(value)) : "-"),
        sortable: true,
      },
    ],
    []
  );

  return (
    <PageContainer title="Review Queue" description="Pruefung und Validierung von AI-Analysen">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.
        </div>
      )}
      <section>
        <h2 className="text-lg font-semibold mb-4">Uebersicht</h2>
        {isLoading ? (
          <KPIGrid columns={3}>
            {Array.from({ length: 3 }).map((_, i) => (<KPICardSkeleton key={i} />))}
          </KPIGrid>
        ) : stats ? (
          <KPIGrid columns={3}>
            <KPICard title="Ausstehende Pruefungen" value={formatNumber(stats.pendingReviews)} subtitle="Warten auf manuelle Pruefung" icon={ClipboardCheck} thresholdColor={stats.pendingReviews > 10 ? "amber" : "green"} />
            <KPICard title="Auto-genehmigt" value={formatNumber(stats.autoApproved)} subtitle="Automatisch genehmigt" icon={CheckCircle} thresholdColor="green" />
            <KPICard title="Korrekturen" value={formatNumber(stats.totalCorrections)} subtitle={"Uebernahmerate: " + stats.incorporationRate.toFixed(1) + "%"} icon={PenTool} thresholdColor="blue" />
          </KPIGrid>
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">Warteschlange</h2>
        {isLoading ? (<TableSkeleton rows={8} />) : queue ? (
          <DataTable data={queue} columns={columns} pageSize={10} emptyMessage="Keine Eintraege in der Warteschlange" />
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">Korrekturen nach Feld</h2>
        {isLoading ? (<ChartSkeleton />) : correctionsData.length > 0 ? (
          <ChartCard title="Korrekturverteilung" subtitle="Welche Felder am haeufigsten korrigiert werden">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={correctionsData} layout="horizontal" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="germanLabel" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">Keine Korrekturdaten vorhanden.</div>
        )}
      </section>
    </PageContainer>
  );
}
