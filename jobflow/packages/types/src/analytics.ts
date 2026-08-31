/**
 * Produktereignisse für den Funnel.
 *
 * Wir messen den Weg von der Anfrage zum Auftrag - nicht Downloads.
 * Die Ereignisse enthalten bewusst keine personenbezogenen Freitexte.
 */
export const ANALYTICS_EVENTS = [
  "request_created",
  "ai_analysis_completed",
  "match_generated",
  "offer_created",
  "offer_accepted",
  "appointment_booked",
  "job_completed",
  "review_created",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
