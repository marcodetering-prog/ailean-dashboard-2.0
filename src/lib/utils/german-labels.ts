// ============================================================
// German translations for all enum values used in the dashboard
// ============================================================

import type {
  Brand,
  BugCategory,
  BugClusterStatus,
  CorrectionStatus,
  DeficiencyCategory,
  DeficiencyStateCategory,
  EstimatedSeverity,
  EventOutcome,
  Intent,
  InquiryType,
  ResolutionMethod,
  ReviewStatus,
  SLACompliance,
  TenantSentiment,
} from "@/lib/types/database";

export const intentLabels: Record<Intent, string> = {
  check_in: "Nachfrage",
  new_inquiry: "Neue Anfrage",
  status_update: "Statusmeldung",
};

export const inquiryTypeLabels: Record<InquiryType, string> = {
  appliance: "Geraete",
  check_in: "Nachfrage",
  cleaning: "Reinigung",
  electrical: "Elektrik",
  general_inquiry: "Allgemeine Anfrage",
  heating: "Heizung",
  major_deficiency: "Grosser Mangel",
  minor_deficiency: "Kleiner Mangel",
  mold: "Schimmel",
  move_in: "Einzug",
  noise: "Laerm",
  other: "Sonstiges",
  outdoor: "Aussenbereich",
  pest: "Schaedlingsbekaempfung",
  plumbing: "Sanitaer",
  status_update: "Statusmeldung",
  structural: "Baustruktur",
};

export const eventOutcomeLabels: Record<EventOutcome, string> = {
  no_response: "Keine Antwort",
  resolved: "Geloest",
  unanswered: "Unbeantwortet",
  unresolved: "Ungeloest",
};

export const sentimentLabels: Record<TenantSentiment, string> = {
  confused: "Verwirrt",
  frustrated: "Frustriert",
  neutral: "Neutral",
  satisfied: "Zufrieden",
  urgent: "Dringend",
};

export const severityLabels: Record<EstimatedSeverity, string> = {
  critical: "Kritisch",
  high: "Hoch",
  low: "Niedrig",
  medium: "Mittel",
};

export const resolutionMethodLabels: Record<ResolutionMethod, string> = {
  agent_takeover: "Agent-Uebernahme",
  deficiency_report_sent: "Mangelbericht gesendet",
  deficiency_updated: "Mangel aktualisiert",
  electricity_investigation: "Elektrik-Untersuchung",
  information_provided: "Information bereitgestellt",
  move_in_email: "Einzugs-E-Mail",
  no_resolution: "Keine Loesung",
  self_repair_guidance: "Selbstreparatur-Anleitung",
  self_repaired: "Selbst repariert",
  tenant_abandoned: "Mieter abgebrochen",
};

export const deficiencyCategoryLabels: Record<DeficiencyCategory, string> = {
  appliance: "Geraete",
  cleaning: "Reinigung",
  electrical: "Elektrik",
  general_inquiry: "Allgemeine Anfrage",
  heating: "Heizung",
  mold: "Schimmel",
  move_in: "Einzug",
  noise: "Laerm",
  outdoor: "Aussenbereich",
  pest: "Schaedlingsbekaempfung",
  plumbing: "Sanitaer",
  structural: "Baustruktur",
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  auto_approved: "Automatisch genehmigt",
  pending_review: "Pruefung ausstehend",
};

export const slaLabels: Record<SLACompliance, string> = {
  compliant: "Eingehalten",
  breached: "Verletzt",
  at_risk: "Gefaehrdet",
  unknown: "Unbekannt",
};

export const bugCategoryLabels: Record<BugCategory, string> = {
  "Data Retrieval": "Datenabruf",
  Logic: "Logik",
  Misclassification: "Fehlklassifizierung",
};

export const bugClusterStatusLabels: Record<BugClusterStatus, string> = {
  open: "Offen",
  in_sprint: "Im Sprint",
  deferred: "Zurueckgestellt",
  resolved: "Geloest",
};

export const correctionStatusLabels: Record<CorrectionStatus, string> = {
  pending: "Ausstehend",
  incorporated: "Uebernommen",
  rejected: "Abgelehnt",
};

export const brandLabels: Record<Brand, string> = {
  novac: "Novac",
  peterhalter: "Peter Halter",
};

export const stateCategories: Record<DeficiencyStateCategory, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  resolved: "Erledigt",
  closed: "Geschlossen",
};

export const dayOfWeekLabels: Record<number, string> = {
  0: "Sonntag",
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
  6: "Samstag",
};

export const dayOfWeekShortLabels: Record<number, string> = {
  0: "So",
  1: "Mo",
  2: "Di",
  3: "Mi",
  4: "Do",
  5: "Fr",
  6: "Sa",
};

/**
 * Generic label lookup: tries the specific label maps,
 * then falls back to the raw value with first-letter capitalization.
 */
export function getGermanLabel(value: string): string {
  const allMaps: Record<string, string>[] = [
    intentLabels,
    inquiryTypeLabels,
    eventOutcomeLabels,
    sentimentLabels,
    severityLabels,
    resolutionMethodLabels,
    deficiencyCategoryLabels,
    reviewStatusLabels,
    slaLabels,
    bugCategoryLabels,
    bugClusterStatusLabels,
    correctionStatusLabels,
    brandLabels,
  ];

  for (const map of allMaps) {
    if (value in map) {
      return map[value];
    }
  }

  // Fallback: capitalize and replace underscores
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
