"use client";

import {
  Zap,
  Clock,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Globe,
  Users,
  RefreshCw,
  Bug,
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
import { PlaceholderCard } from "@/components/shared/placeholder-card";
import {
  KPICardSkeleton,
  ChartSkeleton,
} from "@/components/shared/loading-skeleton";
import {
  formatNumber,
  formatPercentRaw,
  formatDuration,
} from "@/lib/utils/formatting";
import {
  getInverseThresholdColor,
  getThresholdColor,
  inverseThresholds,
  thresholds,
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

interface AdoptionPoint {
  period: string;
  uniqueTenants: number;
  adoptionRate: number;
}

interface AIPerfData {
  totalEvents: number;
  // ADD-5
  avgFirstResponseSec: number;
  medianFirstResponseSec: number;
  // ADD-6
  slaComplianceRate: number;
  slaCompliant: number;
  slaBreached: number;
  slaAtRisk: number;
  // ADD-8
  falseSuccessCount: number;
  falseSuccessRate: number;
  failedReportCount: number;
  failedReportRate: number;
  // ADD-9
  totalMessages: number;
  avgMessages: number;
  totalInbound: number;
  totalAiMessages: number;
  // ADD-10
  languageBreakdown: BreakdownItem[];
  // ADD-11
  uniqueTenants: number;
  repeatTenants: number;
  repeatTenantRate: number;
  // ADD-12
  pingPongRate: number;
  avgPingPong: number;
  maxPingPong: number;
  pingPongDistribution: BreakdownItem[];
  // ADD-13
  avgEffortScore: number;
  // ADD-15
  bugCount: number;
  bugRate: number;
  bugFalseSuccess: number;
  bugFailedReport: number;
  // ADD-17
  totalProperties: number;
  adoptionTrend: AdoptionPoint[];
  currentAdoptionRate: number;
  // General
  avgAutomationRate: number;
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

export default function AIPerformancePage() {
  const { data, isLoading, error } =
    useDashboardData<AIPerfData>("/api/ai-perf");

  const automationDisplay =
    data != null
      ? data.avgAutomationRate <= 1
        ? data.avgAutomationRate * 100
        : data.avgAutomationRate
      : 0;

  return (
    <PageContainer
      title="AI Performance"
      description="ADD-5 bis ADD-17 — Antwortzeit, SLA, Bugs, Ping-Pong, Adoption"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden der Daten.
        </div>
      )}

      {/* Section 1: Core Performance */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Kern-Performance</h2>
        {isLoading ? (
          <KPIGrid columns={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : data ? (
          <KPIGrid columns={4}>
            <KPICard
              title="Antwortzeit (Median)"
              value={formatDuration(data.medianFirstResponseSec)}
              subtitle={
                "ADD-5 — Durchschnitt: " +
                formatDuration(data.avgFirstResponseSec)
              }
              icon={Clock}
              thresholdColor={getInverseThresholdColor(
                data.medianFirstResponseSec,
                inverseThresholds.avgFirstResponseSec
              )}
            />
            <KPICard
              title="SLA Compliance"
              value={formatPercentRaw(data.slaComplianceRate)}
              subtitle={
                "ADD-6 — " +
                data.slaCompliant +
                " eingehalten, " +
                data.slaBreached +
                " verletzt"
              }
              icon={ShieldCheck}
              thresholdColor={getThresholdColor(
                data.slaComplianceRate,
                thresholds.slaComplianceRate
              )}
            />
            <KPICard
              title="Bug Rate"
              value={formatPercentRaw(data.bugRate)}
              subtitle={
                "ADD-15 — " +
                data.bugCount +
                " Bugs von " +
                data.totalEvents +
                " Events"
              }
              icon={Bug}
              thresholdColor={getInverseThresholdColor(
                data.bugRate,
                inverseThresholds.bugRate
              )}
            />
            <KPICard
              title="Automatisierungsrate"
              value={formatPercentRaw(automationDisplay)}
              subtitle="Durchschnittliche Automatisierung"
              icon={Zap}
              thresholdColor="blue"
            />
          </KPIGrid>
        ) : null}
      </section>

      {/* Section 2: Quality Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Qualitaetsmetriken</h2>
        {isLoading ? (
          <KPIGrid columns={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </KPIGrid>
        ) : data ? (
          <KPIGrid columns={4}>
            <KPICard
              title="False Success Rate"
              value={formatPercentRaw(data.falseSuccessRate)}
              subtitle={
                "ADD-8 — " + data.falseSuccessCount + " Faelle"
              }
              icon={AlertTriangle}
              thresholdColor={getInverseThresholdColor(
                data.falseSuccessRate,
                { green: 3, amber: 7 }
              )}
            />
            <KPICard
              title="Failed Report Rate"
              value={formatPercentRaw(data.failedReportRate)}
              subtitle={data.failedReportCount + " fehlgeschlagene Berichte"}
              icon={AlertTriangle}
              thresholdColor={getInverseThresholdColor(
                data.failedReportRate,
                { green: 10, amber: 20 }
              )}
            />
            <KPICard
              title="Repeat Tenant Rate"
              value={formatPercentRaw(data.repeatTenantRate)}
              subtitle={
                "ADD-11 — " +
                data.repeatTenants +
                " von " +
                data.uniqueTenants +
                " Mietern"
              }
              icon={Users}
              thresholdColor="blue"
            />
            <KPICard
              title="Nachrichten/Event"
              value={data.avgMessages.toFixed(1)}
              subtitle={
                "ADD-9 — " +
                formatNumber(data.totalMessages) +
                " total"
              }
              icon={MessageSquare}
              thresholdColor="blue"
            />
          </KPIGrid>
        ) : null}
      </section>

      {/* Section 3: Ping Pong & Language */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          ADD-12 Ping-Pong & ADD-10 Sprache
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="ADD-12 — Ping-Pong Verteilung"
              subtitle={
                "Durchschnitt: " +
                data.avgPingPong.toFixed(1) +
                " | Max: " +
                data.maxPingPong
              }
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={data.pingPongDistribution}
                  margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    <Cell fill={chartColors[1]} />
                    <Cell fill={chartColors[2]} />
                    <Cell fill={chartColors[6]} />
                    <Cell fill={chartColors[3]} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="ADD-10 — Sprachverteilung"
              subtitle="Pro Konversation"
            >
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.languageBreakdown.slice(0, 6)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={renderPieLabel}
                    labelLine
                  >
                    {data.languageBreakdown.slice(0, 6).map((_, i) => (
                      <Cell
                        key={"l-" + i}
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

      {/* Section 4: Adoption Trend */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          ADD-17 — Mieter-Adoptionsrate
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KPICardSkeleton />
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KPICard
              title="Aktuelle Adoptionsrate"
              value={formatPercentRaw(data.currentAdoptionRate)}
              subtitle={
                data.uniqueTenants +
                " aktive Mieter / " +
                formatNumber(data.totalProperties) +
                " Einheiten"
              }
              icon={TrendingUp}
              thresholdColor="blue"
            />
            <div className="lg:col-span-2">
              <ChartCard
                title="Monatlicher Adoptionsverlauf"
                subtitle="Unique Mieter pro Monat"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={data.adoptionTrend}
                    margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="uniqueTenants"
                      stroke={chartColors[1]}
                      fill={chartColors[1]}
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        ) : null}
      </section>

      {/* Ping Pong KPI card */}
      {!isLoading && data && (
        <section>
          <KPIGrid columns={3}>
            <KPICard
              title="Ping-Pong Rate"
              value={formatPercentRaw(data.pingPongRate)}
              subtitle={
                "ADD-12 — Durchschn. " +
                data.avgPingPong.toFixed(1) +
                " Zyklen"
              }
              icon={RefreshCw}
              thresholdColor={getInverseThresholdColor(
                data.pingPongRate,
                inverseThresholds.loopRate
              )}
            />
            <KPICard
              title="Sprachen"
              value={formatNumber(data.languageBreakdown.length)}
              subtitle="ADD-10 — Erkannte Sprachen"
              icon={Globe}
              thresholdColor="blue"
            />
            <KPICard
              title="Inbound / AI Nachrichten"
              value={
                formatNumber(data.totalInbound) +
                " / " +
                formatNumber(data.totalAiMessages)
              }
              subtitle="ADD-9 — Mieter vs. AI Nachrichten"
              icon={MessageSquare}
              thresholdColor="blue"
            />
          </KPIGrid>
        </section>
      )}

      {/* Under Construction & Coming Soon */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Weitere KPIs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PlaceholderCard
            kpiNumber="ADD-13"
            title="Mieter-Aufwand-Score (Proxy)"
            status="under-construction"
            description={
              "Berechneter Wert: " +
              (data?.avgEffortScore?.toFixed(2) ?? "—") +
              " / 10. Gewichtung und Schwellenwerte muessen validiert werden."
            }
          />
          <PlaceholderCard
            kpiNumber="ADD-1"
            title="Event-Klassifizierung"
            status="coming-soon"
            description="AI-Layer fuer 14 Event-Typen zu 3 Kategorien (Major/Minor/QnA) erforderlich."
          />
          <PlaceholderCard
            kpiNumber="ADD-2"
            title="Anfragen pro Tag"
            status="coming-soon"
            description="Abhaengig von ADD-1 Event-Klassifizierung."
          />
          <PlaceholderCard
            kpiNumber="ADD-7"
            title="Routing-Genauigkeit"
            status="coming-soon"
            description="AI-Selbstbewertung unzuverlaessig. Menschliche Validierung erforderlich."
          />
        </div>
      </section>
    </PageContainer>
  );
}
