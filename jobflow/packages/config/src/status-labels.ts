/**
 * Deutsche Bezeichnungen fuer die Status-Werte aus @jobflow/types.
 *
 * Die Typen selbst bleiben englisch (sie sind Datenbankwerte), die Oberflaeche
 * ist deutsch. Diese Zuordnung liegt zentral, damit Mobile, Web und Admin
 * dieselben Woerter verwenden.
 */

export const requestStatusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  ANALYZING: "Wird analysiert",
  OPEN: "Offen",
  MATCHING: "Anbieter werden gesucht",
  OFFERED: "Angebote erhalten",
  ACCEPTED: "Angebot angenommen",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Zurueckgezogen",
};

export const offerStatusLabels: Record<string, string> = {
  PENDING: "Offen",
  ACCEPTED: "Angenommen",
  DECLINED: "Abgelehnt",
  WITHDRAWN: "Zurueckgezogen",
  EXPIRED: "Abgelaufen",
};

export const appointmentStatusLabels: Record<string, string> = {
  PROPOSED: "Vorgeschlagen",
  CONFIRMED: "Bestaetigt",
  CANCELLED: "Abgesagt",
  COMPLETED: "Stattgefunden",
};

export const jobStatusLabels: Record<string, string> = {
  SCHEDULED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

export const urgencyLabels: Record<string, string> = {
  LOW: "Kann warten",
  NORMAL: "Normal",
  HIGH: "Dringend",
};

/** Reihenfolge der Schritte in der Statusanzeige einer Anfrage. */
export const requestTimeline = [
  { status: "OPEN", label: "Anfrage erstellt" },
  { status: "MATCHING", label: "Anbieter gefunden" },
  { status: "OFFERED", label: "Angebot erhalten" },
  { status: "ACCEPTED", label: "Angebot angenommen" },
  { status: "COMPLETED", label: "Auftrag abgeschlossen" },
] as const;
