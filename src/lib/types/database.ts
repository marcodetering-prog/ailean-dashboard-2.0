// ============================================================
// AILEAN KPI Dashboard — Database Type Definitions
// All types derived from Supabase project acughkfcgirmckvsndoh
// ============================================================

// --- Enum Types ---

export type Brand = "novac" | "peterhalter";

export type Intent = "check_in" | "new_inquiry" | "status_update";

export type InquiryType =
  | "appliance"
  | "check_in"
  | "cleaning"
  | "electrical"
  | "general_inquiry"
  | "heating"
  | "major_deficiency"
  | "minor_deficiency"
  | "mold"
  | "move_in"
  | "noise"
  | "other"
  | "outdoor"
  | "pest"
  | "plumbing"
  | "status_update"
  | "structural";

export type EventOutcome =
  | "no_response"
  | "resolved"
  | "unanswered"
  | "unresolved";

export type TenantSentiment =
  | "confused"
  | "frustrated"
  | "neutral"
  | "satisfied"
  | "urgent";

export type EstimatedSeverity = "critical" | "high" | "low" | "medium";

export type ReviewStatus = "auto_approved" | "pending_review";

export type ResolutionMethod =
  | "agent_takeover"
  | "deficiency_report_sent"
  | "deficiency_updated"
  | "electricity_investigation"
  | "information_provided"
  | "move_in_email"
  | "no_resolution"
  | "self_repair_guidance"
  | "self_repaired"
  | "tenant_abandoned";

export type DeficiencyCategory =
  | "appliance"
  | "cleaning"
  | "electrical"
  | "general_inquiry"
  | "heating"
  | "mold"
  | "move_in"
  | "noise"
  | "outdoor"
  | "pest"
  | "plumbing"
  | "structural";

export type DeficiencyStateLabel =
  | "Appointment Scheduled"
  | "Awaiting Response"
  | "Cancelled"
  | "Cost Approved"
  | "Craftsman Assigned"
  | "Created"
  | "Invoice Disputed"
  | "Invoice Submitted"
  | "On Hold"
  | "Reopened"
  | "Repair Completed"
  | "Sent to Craftsman"
  | "Tenant Confirmed"
  | "Under Repair";

export type DeficiencyStateCategory =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export type BugCategory = "Data Retrieval" | "Logic" | "Misclassification";

export type BugClusterStatus = "open" | "in_sprint" | "deferred" | "resolved";

export type Reproducibility = "always" | "sometimes" | "once" | "unknown";

export type SLACompliance =
  | "compliant"
  | "breached"
  | "at_risk"
  | "unknown";

export type CorrectionStatus = "pending" | "incorporated" | "rejected";

export type PricingModel = "pro_unit" | "per_category";

export type PricingCategory = "Major" | "Minor" | "QnA";

// --- Row Types ---

/** Row from tenant_inquiry_ai_analysis (PRIMARY KPI SOURCE) */
export interface AIAnalysisRow {
  id: number;
  conversation_id: string;
  inquiry_sequence: number;
  event_hash: string;
  // Topic & Classification
  topic_labels: string[] | null;
  topic_count: number | null;
  has_topic_change: boolean | null;
  deficiency_category: DeficiencyCategory | null;
  deficiency_location: string | null;
  language_used: string | null;
  is_urgent: boolean | null;
  estimated_severity: EstimatedSeverity | null;
  // AI Quality & Performance
  ai_quality_score: number | null;
  ai_misunderstood: boolean | null;
  ai_loop_detected: boolean | null;
  ai_correct_triage: boolean | null;
  ai_unnecessary_questions: number | null;
  tenant_sentiment: TenantSentiment | null;
  tenant_effort_score: number | null;
  resolution_method: ResolutionMethod | null;
  sla_compliance: SLACompliance | null;
  event_summary: string | null;
  // Bug Tracking
  is_bug: boolean | null;
  bug_category: BugCategory | null;
  bug_cluster_id: string | null;
  bug_cluster_label: string | null;
  bug_reviewed_at: string | null;
  bug_reviewed_week: number | null;
  linear_issue_id: string | null;
  linear_sub_issue_id: string | null;
  linear_transferred_at: string | null;
  reproducible: Reproducibility | null;
  // Metadata
  analyzed_at: string | null;
  first_analyzed_at: string | null;
  model_used: string | null;
  analysis_version: number | null;
  analysis_run_count: number | null;
  change_trigger: string | null;
  review_status: ReviewStatus | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  cost_estimate_accuracy: string | null;
}

/** Row from tenant_inquiry_events (JOIN ONLY) */
export interface EventRow {
  conversation_id: string;
  inquiry_sequence: number;
  phone_number: string | null;
  brand: Brand | null;
  intent: Intent | null;
  inquiry_type: InquiryType | null;
  started_at: string | null;
  ended_at: string | null;
  message_count: number | null;
  inbound_count: number | null;
  ai_count: number | null;
  ping_pong_count: number | null;
  image_count: number | null;
  first_response_sec: number | null;
  duration_minutes: number | null;
  avg_ai_response_sec: number | null;
  avg_tenant_response_sec: number | null;
  time_to_deficiency_report_sec: number | null;
  automation_rate: number | null;
  human_agent_count: number | null;
  has_agent_takeover: boolean | null;
  tool_call_count: number | null;
  is_inside_hours: boolean | null;
  started_dow: number | null;
  started_hour_cet: number | null;
  deficiency_state: number | null;
  deficiency_total_cost: number | null;
  has_craftsman: boolean | null;
  has_deficiency_report: boolean | null;
  deficiencies_created: number | null;
  deficiency_state_label: string | null;
  event_outcome: EventOutcome | null;
  has_self_repair: boolean | null;
  has_deficiency_update: boolean | null;
}

/** Combined row from v_dashboard_base (AI analysis + events JOIN) */
export interface DashboardBaseRow extends AIAnalysisRow {
  // Event fields added via JOIN
  phone_number: string | null;
  brand: Brand | null;
  intent: Intent | null;
  inquiry_type: InquiryType | null;
  started_at: string | null;
  ended_at: string | null;
  message_count: number | null;
  inbound_count: number | null;
  ai_count: number | null;
  ping_pong_count: number | null;
  image_count: number | null;
  first_response_sec: number | null;
  duration_minutes: number | null;
  avg_ai_response_sec: number | null;
  avg_tenant_response_sec: number | null;
  time_to_deficiency_report_sec: number | null;
  automation_rate: number | null;
  human_agent_count: number | null;
  has_agent_takeover: boolean | null;
  tool_call_count: number | null;
  is_inside_hours: boolean | null;
  started_dow: number | null;
  started_hour_cet: number | null;
  deficiency_state: number | null;
  deficiency_total_cost: number | null;
  has_craftsman: boolean | null;
  has_deficiency_report: boolean | null;
  deficiencies_created: number | null;
  deficiency_state_label: string | null;
  event_outcome: EventOutcome | null;
  has_self_repair: boolean | null;
  has_deficiency_update: boolean | null;
}

/** Row from bug_clusters */
export interface BugClusterRow {
  id: string;
  cluster_label: string;
  bug_category: BugCategory;
  root_cause_description: string | null;
  event_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  linear_parent_issue_id: string | null;
  linear_transferred_at: string | null;
  sprint_ready: boolean;
  status: BugClusterStatus;
  created_at: string;
  updated_at: string;
}

/** Row from ai_analysis_corrections */
export interface CorrectionRow {
  id: string;
  conversation_id: string;
  inquiry_sequence: number;
  field_corrected: string;
  ai_value: string | null;
  correct_value: string | null;
  correction_reason: string | null;
  corrected_by: string | null;
  corrected_at: string;
  status: CorrectionStatus;
  incorporated_at: string | null;
  learning_note: string | null;
  reanalysis_triggered: boolean | null;
}

/** Row from tenant_profiles */
export interface TenantProfileRow {
  phone_number: string;
  tenant_name: string | null;
  tenant_email: string | null;
  brand: Brand | null;
  building_address: string | null;
  apartment_number: string | null;
  floor: string | null;
  rooms: number | null;
  apartment_size: number | null;
  build_year: number | null;
  refurbishment_year: number | null;
  property_owner: string | null;
  accommodation_id: string | null;
  major_deficiency_cost_limit: number | null;
  escalation_email: string | null;
  total_conversations: number | null;
  total_deficiencies: number | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

/** Row from deficiency_state_labels */
export interface DeficiencyStateLabelRow {
  state_id: number;
  state_label: string;
  state_category: DeficiencyStateCategory;
}

/** Row from deficiency_type_labels */
export interface DeficiencyTypeLabelRow {
  bit_value: number;
  type_label: string;
  trade_cat: string;
}

/** Row from deficiency_category_mapping */
export interface DeficiencyCategoryMappingRow {
  ai_category: DeficiencyCategory;
  bit_value: number;
  is_primary: boolean;
}

/** Row from v_tenant_ai_profile view */
export interface TenantAIProfileRow {
  phone_number: string;
  brand: Brand | null;
  tenant_name: string | null;
  building_address: string | null;
  conversations_analyzed: number;
  events_analyzed: number;
  most_common_category: DeficiencyCategory | null;
  all_categories: string[] | null;
  dominant_sentiment: TenantSentiment | null;
  avg_effort_score: number | null;
  frustrated_events: number;
  urgent_events: number;
  avg_ai_quality: number | null;
  times_misunderstood: number;
  times_looped: number;
  high_severity_events: number;
  primary_language: string | null;
}

/** Row from ailean_pricing */
export interface PricingRow {
  id: number;
  brand: Brand;
  pricing_model: PricingModel;
  hourly_rate: number;
  time_per_category_major: number;
  time_per_category_minor: number;
  time_per_category_qna: number;
  ailean_per_unit: number;
  ailean_per_category_major: number;
  ailean_per_category_minor: number;
  ailean_per_category_qna: number;
  created_at: string;
  updated_at: string;
}
