import type { IsoDateTime, Uuid } from "./common.js";

export const APPOINTMENT_STATUSES = ["PROPOSED", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Ein Termin gehört immer zu einem angenommenen Angebot. */
export interface Appointment {
  id: Uuid;
  offerId: Uuid;
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  status: AppointmentStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Freies Zeitfenster, das aus der Verfügbarkeit eines Unternehmens folgt. */
export interface AvailableSlot {
  startTime: IsoDateTime;
  endTime: IsoDateTime;
}
