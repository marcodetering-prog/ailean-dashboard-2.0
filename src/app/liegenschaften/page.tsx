"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageContainer } from "@/components/layout/page-container";
import {
  TableSkeleton,
  ChartSkeleton,
} from "@/components/shared/loading-skeleton";
import { formatNumber, formatPercentRaw } from "@/lib/utils/formatting";
import { getGermanLabel } from "@/lib/utils/german-labels";
import { getSeverityColor } from "@/lib/utils/thresholds";
import type { ThresholdColor } from "@/lib/utils/thresholds";

interface BuildingStats {
  address: string;
  totalInquiries: number;
  deficiencyReports: number;
  resolvedCount: number;
  tenantCount: number;
}

interface OwnerStats {
  propertyOwner: string;
  brand: string;
  totalInquiries: number;
  deficiencyReports: number;
  resolvedCount: number;
  resolutionRate: number;
  tenantCount: number;
  avgQualityScore: number | null;
  avgDurationMin: number | null;
  buildings: BuildingStats[];
}

interface SeverityMatrixItem {
  severity: string;
  category: string;
  count: number;
}

interface PropertiesData {
  owners: OwnerStats[];
  severityMatrix: SeverityMatrixItem[];
}

function qualityColor(score: number | null): ThresholdColor {
  if (score == null) return "blue";
  if (score >= 7) return "green";
  if (score >= 5) return "amber";
  return "red";
}

export default function LiegenschaftenPage() {
  const { data, isLoading, error } =
    useDashboardData<PropertiesData>("/api/properties");
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

  const toggleOwner = (owner: string) => {
    setExpandedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(owner)) {
        next.delete(owner);
      } else {
        next.add(owner);
      }
      return next;
    });
  };

  const ownerColumns = useMemo<ColumnDef<OwnerStats>[]>(
    () => [
      {
        key: "propertyOwner",
        header: "Eigentuemer",
        accessor: (row) => row.propertyOwner,
        render: (_value, row) => (
          <button
            className="flex items-center gap-2 text-left font-medium hover:text-primary"
            onClick={() => toggleOwner(row.propertyOwner)}
          >
            {row.buildings.length > 0 ? (
              expandedOwners.has(row.propertyOwner) ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )
            ) : (
              <span className="w-4" />
            )}
            {row.propertyOwner}
          </button>
        ),
        sortable: true,
      },
      {
        key: "brand",
        header: "Marke",
        accessor: (row) => row.brand,
        render: (value) => (
          <StatusBadge
            label={String(value) === "peterhalter" ? "Peter Halter" : "Novac"}
            color="blue"
          />
        ),
        sortable: true,
      },
      {
        key: "totalInquiries",
        header: "Anfragen",
        accessor: (row) => row.totalInquiries,
        render: (value) => formatNumber(Number(value)),
        align: "right" as const,
        sortable: true,
      },
      {
        key: "deficiencyReports",
        header: "Maengel",
        accessor: (row) => row.deficiencyReports,
        render: (value) => formatNumber(Number(value)),
        align: "right" as const,
        sortable: true,
      },
      {
        key: "resolutionRate",
        header: "Erledigungsrate",
        accessor: (row) => row.resolutionRate,
        render: (value) => formatPercentRaw(Number(value)),
        align: "right" as const,
        sortable: true,
      },
      {
        key: "tenantCount",
        header: "Mieter",
        accessor: (row) => row.tenantCount,
        render: (value) => formatNumber(Number(value)),
        align: "right" as const,
        sortable: true,
      },
      {
        key: "avgQualityScore",
        header: "Qualitaet",
        accessor: (row) => row.avgQualityScore,
        render: (_value, row) => (
          <StatusBadge
            label={
              row.avgQualityScore != null
                ? row.avgQualityScore.toFixed(1) + "/10"
                : "-"
            }
            color={qualityColor(row.avgQualityScore)}
          />
        ),
        align: "center" as const,
        sortable: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expandedOwners]
  );

  const severityData = useMemo(() => {
    if (!data?.severityMatrix || data.severityMatrix.length === 0) return null;
    const severities = [
      ...new Set(data.severityMatrix.map((s) => s.severity)),
    ];
    const categories = [
      ...new Set(data.severityMatrix.map((s) => s.category)),
    ];
    const lookup = new Map<string, number>();
    for (const item of data.severityMatrix) {
      lookup.set(item.severity + "|" + item.category, item.count);
    }
    return { severities, categories, lookup };
  }, [data]);

  return (
    <PageContainer
      title="Liegenschaften"
      description="Eigentuemer, Liegenschaften und Mangelverteilung"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten. Bitte versuchen Sie es spaeter erneut.
        </div>
      )}

      {/* Owner Table with Building Expansion */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Eigentuemer-Uebersicht
        </h2>
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : data?.owners ? (
          <div className="space-y-0">
            <DataTable
              data={data.owners}
              columns={ownerColumns}
              pageSize={15}
              emptyMessage="Keine Eigentuemerdaten vorhanden"
              renderRowExpansion={(row) => {
                if (
                  !expandedOwners.has(row.propertyOwner) ||
                  row.buildings.length === 0
                )
                  return null;
                return (
                  <tr>
                    <td colSpan={ownerColumns.length} className="p-0">
                      <div className="bg-muted/30 px-8 py-3">
                        <div className="space-y-1">
                          {row.buildings.map((b) => (
                            <div
                              key={b.address}
                              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                            >
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="flex-1 font-medium">
                                {b.address}
                              </span>
                              <span className="text-muted-foreground w-20 text-right">
                                {b.totalInquiries} Anfr.
                              </span>
                              <span className="text-muted-foreground w-20 text-right">
                                {b.deficiencyReports} Maengel
                              </span>
                              <span className="text-muted-foreground w-20 text-right">
                                {b.tenantCount} Mieter
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          </div>
        ) : null}
      </section>

      {/* Severity Matrix */}
      {!isLoading && severityData && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Schweregrad-Matrix</h2>
          <ChartCard
            title="Schweregrad nach Kategorie"
            subtitle="Verteilung der Maengel nach Schweregrad und Kategorie"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Schweregrad
                    </th>
                    {severityData.categories.map((cat) => (
                      <th
                        key={cat}
                        className="px-4 py-3 text-center font-medium text-muted-foreground"
                      >
                        {getGermanLabel(cat)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {severityData.severities.map((sev) => (
                    <tr
                      key={sev}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={getGermanLabel(sev)}
                          color={getSeverityColor(sev)}
                        />
                      </td>
                      {severityData.categories.map((cat) => {
                        const count =
                          severityData.lookup.get(sev + "|" + cat) ?? 0;
                        return (
                          <td key={cat} className="px-4 py-3 text-center">
                            {count > 0 ? (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted font-medium">
                                {count}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
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
      {isLoading && (
        <section>
          <ChartSkeleton />
        </section>
      )}
    </PageContainer>
  );
}
