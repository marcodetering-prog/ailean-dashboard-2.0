// ============================================================
// AILEAN KPI Dashboard — API Response Type Definitions
// ============================================================

import type {
  Brand,
  BugCategory,
  BugClusterStatus,
  CorrectionStatus,
  DeficiencyCategory,
  EstimatedSeverity,
  EventOutcome,
  Intent,
  InquiryType,
  ResolutionMethod,
  ReviewStatus,
  SLACompliance,
  TenantSentiment,
} from "./database";

// --- Shared Types ---

export interface TimeSeriesPoint {
  period: string; // ISO date or week label
  value: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

export interface DashboardFilters {
  dateFrom?: string; // ISO date YYYY-MM-DD
  dateTo?: string; // ISO date YYYY-MM-DD
  brand?: Brand | "all";
}

// --- /api/summary ---

export interface SummaryResponse {
  // Aggregate KPIs
  totalEvents: number;
  totalWithDeficiencyReport: number;
  deficiencyReportRate: number;
  avgAiQualityScore: number;
  avgTenantEffort: number;
  loopDetectionRate: number;
  misunderstandingRate: number;
  bugRate: number;
  correctTriageRate: number;
  avgUnnecessaryQuestions: number;
  urgencyRate: number;
  automationRate: number;
  avgFirstResponseSec: number;
  avgDurationMin: number;
  avgTimeToReportSec: number | null;
  agentTakeoverRate: number;
  // Breakdowns
  sentimentBreakdown: BreakdownItem[];
  severityBreakdown: BreakdownItem[];
  categoryBreakdown: BreakdownItem[];
  resolutionBreakdown: BreakdownItem[];
  languageBreakdown: BreakdownItem[];
  slaBreakdown: BreakdownItem[];
  qualityScoreDistribution: BreakdownItem[];
  effortScoreDistribution: BreakdownItem[];
  stateBreakdown: BreakdownItem[];
  intentBreakdown: BreakdownItem[];
  outcomeBreakdown: BreakdownItem[];
  inquiryTypeBreakdown: BreakdownItem[];
  topTopics: BreakdownItem[];
  // Timing
  businessHoursBreakdown: BreakdownItem[];
  dayOfWeekBreakdown: BreakdownItem[];
  hourOfDayBreakdown: BreakdownItem[];
}

// --- /api/ai-quality ---

export interface AIQualityResponse {
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
  qualityTrend: TimeSeriesPoint[];
}

// --- /api/bugs ---

export interface BugCluster {
  id: string;
  clusterLabel: string;
  bugCategory: BugCategory;
  rootCauseDescription: string | null;
  eventCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  linearParentIssueId: string | null;
  sprintReady: boolean;
  status: BugClusterStatus;
}

export interface BugEvent {
  conversationId: string;
  inquirySequence: number;
  bugCategory: BugCategory | null;
  bugClusterLabel: string | null;
  eventSummary: string | null;
  linearIssueId: string | null;
  reproducible: string | null;
  startedAt: string | null;
}

export interface BugSummaryResponse {
  totalBugs: number;
  bugRate: number;
  categoryBreakdown: BreakdownItem[];
  statusBreakdown: BreakdownItem[];
  unreviewedCount: number;
  bugTrend: TimeSeriesPoint[];
  reproducibilityBreakdown: BreakdownItem[];
}

// --- /api/trends ---

export interface TrendDataPoint {
  period: string;
  count?: number;
  avgQuality?: number;
  loopRate?: number;
  bugRate?: number;
  automationRate?: number;
  deficiencyReportRate?: number;
}

export interface SentimentTrendPoint {
  period: string;
  neutral: number;
  frustrated: number;
  satisfied: number;
  confused: number;
  urgent: number;
}

export interface CategoryTrendPoint {
  period: string;
  [category: string]: string | number;
}

// --- /api/review ---

export interface ReviewQueueItem {
  conversationId: string;
  inquirySequence: number;
  reviewStatus: ReviewStatus;
  eventSummary: string | null;
  deficiencyCategory: DeficiencyCategory | null;
  aiQualityScore: number | null;
  tenantSentiment: TenantSentiment | null;
  isBug: boolean | null;
  bugCategory: BugCategory | null;
  bugClusterLabel: string | null;
  linearIssueId: string | null;
  aiLoopDetected: boolean | null;
  aiMisunderstood: boolean | null;
  resolutionMethod: ResolutionMethod | null;
  startedAt: string | null;
  brand: Brand | null;
}

export interface ReviewStatsResponse {
  pendingReviews: number;
  autoApproved: number;
  totalCorrections: number;
  correctionsByField: BreakdownItem[];
  incorporationRate: number;
}

export interface CorrectionItem {
  id: string;
  conversationId: string;
  inquirySequence: number;
  fieldCorrected: string;
  aiValue: string | null;
  correctValue: string | null;
  correctionReason: string | null;
  correctedBy: string | null;
  correctedAt: string;
  status: CorrectionStatus;
}

// --- /api/properties ---

export interface PropertyOwnerStats {
  propertyOwner: string;
  totalInquiries: number;
  deficiencyReports: number;
  resolvedCount: number;
  resolutionRate: number;
  tenantCount: number;
  avgQualityScore: number | null;
}

export interface PropertyBuildingStats {
  buildingAddress: string;
  propertyOwner: string | null;
  inquiryCount: number;
  deficiencyCount: number;
  resolved: number;
  resolutionRate: number;
  tenantCount: number;
  avgQualityScore: number | null;
}

export interface SeverityCategoryMatrix {
  severity: EstimatedSeverity;
  category: DeficiencyCategory;
  count: number;
}

// --- /api/craftsman ---

export interface CraftsmanOverview {
  totalJobs: number;
  completionRate: number;
  selfRepairCount: number;
  selfRepairRate: number;
  craftsmanAssignedRate: number;
}

export interface CraftsmanPipelineItem {
  stateLabel: string;
  stateCategory: string;
  count: number;
}

export interface CraftsmanCategoryItem {
  category: DeficiencyCategory;
  count: number;
  totalCost: number;
  avgCost: number;
}

// --- /api/insights ---

export interface InsightsPatternsResponse {
  insideHoursCount: number;
  outsideHoursCount: number;
  insideHoursRate: number;
  peakDay: string;
  peakHour: number;
  dayOfWeekBreakdown: BreakdownItem[];
  hourOfDayBreakdown: BreakdownItem[];
}

export interface PortfolioEfficiency {
  deficiencyDensity: number; // deficiencies per managed unit
  avgCostPerInquiry: number;
  slaComplianceRate: number;
  breakEvenPoint: number | null;
}

// --- /api/roi ---

export interface ROICalculation {
  totalUnits: number;
  totalInquiries: number;
  categoryBreakdown: {
    category: string;
    count: number;
    manualCost: number;
    aileanCost: number;
    savings: number;
  }[];
  kostenOhneAilean: number;
  kostenMitAilean: number;
  ersparnis: number;
  savingsPercentage: number;
}

// --- /api/benchmark ---

export interface BenchmarkData {
  brand: Brand;
  totalEvents: number;
  avgQualityScore: number;
  automationRate: number;
  loopRate: number;
  bugRate: number;
  avgFirstResponseSec: number;
  avgDurationMin: number;
  deficiencyReportRate: number;
  sentimentBreakdown: BreakdownItem[];
}
