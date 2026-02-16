"use client";

import { useMemo } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageContainer } from "@/components/layout/page-container";
import { TableSkeleton, ChartSkeleton } from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw } from "@/lib/utils/formatting";
import { getGermanLabel } from "@/lib/utils/german-labels";
import { getSeverityColor } from "@/lib/utils/thresholds";
import type { ThresholdColor } from "@/lib/utils/thresholds";

interface OwnerStats {
  propertyOwner: string;
  totalInquiries: number;
  deficiencyReports: number;
  resolvedCount: number;
  resolutionRate: number;
  tenantCount: number;
  avgQualityScore: number | null;
}
interface SeverityMatrixItem { severity: string; category: string; count: number; }
interface PropertiesData { owners: OwnerStats[]; severityMatrix: SeverityMatrixItem[]; }

function qualityColor(score: number | null): ThresholdColor {
  if (score == null) return "blue";
  if (score >= 4) return "green";
  if (score >= 3) return "amber";
  return "red";
}

export default function LiegenschaftenPage() {
  const { data, isLoading, error } = useDashboardData<PropertiesData>("/api/properties");

  const ownerColumns = useMemo<ColumnDef<OwnerStats>[]>(
    () => [
      { key: "propertyOwner", header: "Eigentuemer", accessor: (row) => row.propertyOwner, sortable: true },
      { key: "totalInquiries", header: "Anfragen", accessor: (row) => row.totalInquiries, render: (value) => formatNumber(Number(value)), align: "right" as const, sortable: true },
      { key: "deficiencyReports", header: "Maengel", accessor: (row) => row.deficiencyReports, render: (value) => formatNumber(Number(value)), align: "right" as const, sortable: true },
      { key: "resolvedCount", header: "Erledigt", accessor: (row) => row.resolvedCount, render: (value) => formatNumber(Number(value)), align: "right" as const, sortable: true },
      { key: "resolutionRate", header: "Erledigungsrate", accessor: (row) => row.resolutionRate, render: (value) => formatPercentRaw(Number(value)), align: "right" as const, sortable: true },
      { key: "tenantCount", header: "Mieter", accessor: (row) => row.tenantCount, render: (value) => formatNumber(Number(value)), align: "right" as const, sortable: true },
      {
        key: "avgQualityScore", header: "Qualitaet", accessor: (row) => row.avgQualityScore,
        render: (value, row) => (<StatusBadge label={row.avgQualityScore != null ? row.avgQualityScore.toFixed(1) + "/5" : "-"} color={qualityColor(row.avgQualityScore)} />),
        align: "center" as const, sortable: true,
      },
    ],
    []
  );

  const severityData = useMemo(() => {
    if (!data?.severityMatrix || data.severityMatrix.length === 0) return null;
    const severities = [...new Set(data.severityMatrix.map((s) => s.severity))];
    const categories = [...new Set(data.severityMatrix.map((s) => s.category))];
    const lookup = new Map<string, number>();
    for (const item of data.severityMatrix) { lookup.set(item.severity + "|" + item.category, item.count); }
    return { severities, categories, lookup };
  }, [data]);

  return (
    <PageContainer title="Liegenschaften" description="Uebersicht ueber Eigentuemer und Liegenschaftsdaten">
      {error && (<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.</div>)}
      <section>
        <h2 className="text-lg font-semibold mb-4">Eigentuemer-Uebersicht</h2>
        {isLoading ? (<TableSkeleton rows={6} />) : data?.owners ? (
          <DataTable data={data.owners} columns={ownerColumns} pageSize={10} emptyMessage="Keine Eigentuemerdaten vorhanden" />
        ) : null}
      </section>
      {!isLoading && severityData && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Schweregrad-Matrix</h2>
          <ChartCard title="Schweregrad nach Kategorie" subtitle="Verteilung der Maengel nach Schweregrad und Kategorie">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Schweregrad</th>
                    {severityData.categories.map((cat) => (
                      <th key={cat} className="px-4 py-3 text-center font-medium text-muted-foreground">{getGermanLabel(cat)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {severityData.severities.map((sev) => (
                    <tr key={sev} className="border-b border-border last:border-0">
                      <td className="px-4 py-3"><StatusBadge label={getGermanLabel(sev)} color={getSeverityColor(sev)} /></td>
                      {severityData.categories.map((cat) => {
                        const count = severityData.lookup.get(sev + "|" + cat) ?? 0;
                        return (
                          <td key={cat} className="px-4 py-3 text-center">
                            {count > 0 ? (<span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted font-medium">{count}</span>) : (<span className="text-muted-foreground">-</span>)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </section>
      )}
      {isLoading && (<section><ChartSkeleton /></section>)}
    </PageContainer>
  );
}
