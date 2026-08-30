import type { IsoDateTime, Uuid } from "./common.js";

export const JOB_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Der Auftrag. Entsteht, sobald der Kunde ein Angebot annimmt.
 * Hier endet der Funnel, den wir messen wollen.
 */
export interface Job {
  id: Uuid;
  offerId: Uuid;
  requestId: Uuid;
  businessId: Uuid;
  customerId: Uuid;
  status: JobStatus;
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
