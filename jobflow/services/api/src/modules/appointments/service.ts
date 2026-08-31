import type { Appointment, AppointmentStatus, AvailableSlot } from "@jobflow/types";
import type { Parsed } from "@jobflow/validation";
import type { createAppointmentSchema } from "@jobflow/validation";
import type { Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { recordEvent } from "../analytics/audit.js";

export type CreateAppointmentData = Parsed<typeof createAppointmentSchema>;

interface AppointmentRow {
  id: string;
  offer_id: string;
  start_time: Date;
  end_time: Date;
  status: AppointmentStatus;
  created_at: Date;
  updated_at: Date;
}

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    offerId: row.offer_id,
    startTime: row.start_time.toISOString(),
    endTime: row.end_time.toISOString(),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Wie weit im Voraus freie Zeitfenster berechnet werden. */
const SLOT_HORIZON_DAYS = 21;
/** Länge eines vorgeschlagenen Zeitfensters in Minuten. */
const SLOT_MINUTES = 60;

export class AppointmentService {
  constructor(private readonly db: Db) {}

  /**
   * Berechnet freie Zeitfenster aus dem Wochenplan eines Unternehmens.
   *
   * Der Kunde bekommt ausschließlich Zeiten zu sehen, die das Unternehmen
   * freigegeben hat, und keine, die bereits belegt sind.
   */
  async availableSlots(businessId: string, from: Date = new Date()): Promise<AvailableSlot[]> {
    const availability = await this.db.query<{ weekday: number; start_time: string; end_time: string }>(
      "SELECT weekday, start_time, end_time FROM business_availability WHERE business_id = $1 ORDER BY weekday, start_time",
      [businessId],
    );
    if (availability.rows.length === 0) return [];

    const until = new Date(from.getTime() + SLOT_HORIZON_DAYS * 24 * 60 * 60 * 1000);
    const booked = await this.db.query<{ start_time: Date; end_time: Date }>(
      `SELECT a.start_time, a.end_time
       FROM appointments a
       JOIN offers o ON o.id = a.offer_id
       WHERE o.business_id = $1
         AND a.status IN ('PROPOSED', 'CONFIRMED')
         AND a.end_time > $2 AND a.start_time < $3`,
      [businessId, from.toISOString(), until.toISOString()],
    );

    const slots: AvailableSlot[] = [];
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);

    for (let day = 0; day <= SLOT_HORIZON_DAYS; day += 1) {
      const date = new Date(cursor.getTime() + day * 24 * 60 * 60 * 1000);
      const weekday = date.getUTCDay();

      for (const window of availability.rows) {
        if (window.weekday !== weekday) continue;
        const windowStart = atTime(date, window.start_time);
        const windowEnd = atTime(date, window.end_time);

        for (
          let start = windowStart.getTime();
          start + SLOT_MINUTES * 60_000 <= windowEnd.getTime();
          start += SLOT_MINUTES * 60_000
        ) {
          const end = start + SLOT_MINUTES * 60_000;
          // Vergangene Zeitfenster gar nicht erst anbieten.
          if (start <= from.getTime()) continue;
          const overlaps = booked.rows.some(
            (appointment) => appointment.start_time.getTime() < end && appointment.end_time.getTime() > start,
          );
          if (!overlaps) {
            slots.push({ startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString() });
          }
        }
      }
    }

    return slots;
  }

  /**
   * Legt einen Termin zu einem angenommenen Angebot an.
   *
   * Ohne angenommenes Angebot gibt es keinen Termin - sonst könnte jemand
   * den Kalender eines Unternehmens füllen, ohne je einen Auftrag zu erteilen.
   */
  async create(userId: string, data: CreateAppointmentData): Promise<Appointment> {
    const start = new Date(data.startTime);
    if (start.getTime() <= Date.now()) {
      throw ApiError.validation({ startTime: "Der Termin muss in der Zukunft liegen." });
    }

    return withTransaction(this.db, async (client) => {
      const offer = await client.query<{ id: string; status: string; business_id: string; request_id: string }>(
        `SELECT o.id, o.status, o.business_id, o.request_id
         FROM offers o
         JOIN requests r ON r.id = o.request_id
         WHERE o.id = $1
           AND (
             r.customer_id = $2
             OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = o.business_id AND bm.user_id = $2)
           )`,
        [data.offerId, userId],
      );
      const offerRow = offer.rows[0];
      if (offerRow === undefined) throw ApiError.notFound("Dieses Angebot gibt es nicht.");
      if (offerRow.status !== "ACCEPTED") {
        throw ApiError.conflict("Ein Termin ist erst nach Annahme des Angebots möglich.");
      }

      // Doppelbelegung verhindern. Der Teilindex in der Datenbank sichert nur
      // "ein aktiver Termin je Angebot" ab - Überschneidungen zwischen
      // verschiedenen Aufträgen desselben Betriebs müssen hier auffallen.
      const conflict = await client.query(
        `SELECT 1
         FROM appointments a
         JOIN offers o ON o.id = a.offer_id
         WHERE o.business_id = $1
           AND a.status IN ('PROPOSED', 'CONFIRMED')
           AND a.start_time < $3 AND a.end_time > $2`,
        [offerRow.business_id, data.startTime, data.endTime],
      );
      if ((conflict.rowCount ?? 0) > 0) {
        throw ApiError.conflict("Zu dieser Zeit ist das Unternehmen bereits belegt.");
      }

      const inserted = await client.query<AppointmentRow>(
        `INSERT INTO appointments (offer_id, start_time, end_time, status)
         VALUES ($1, $2, $3, 'CONFIRMED')
         RETURNING *`,
        [data.offerId, data.startTime, data.endTime],
      );

      await recordEvent(client, {
        name: "appointment_booked",
        userId,
        requestId: offerRow.request_id,
        businessId: offerRow.business_id,
      });

      return mapAppointment(inserted.rows[0] as AppointmentRow);
    });
  }

  async get(appointmentId: string, userId: string): Promise<Appointment> {
    const result = await this.db.query<AppointmentRow>(
      `SELECT a.*
       FROM appointments a
       JOIN offers o ON o.id = a.offer_id
       JOIN requests r ON r.id = o.request_id
       WHERE a.id = $1
         AND (
           r.customer_id = $2
           OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = o.business_id AND bm.user_id = $2)
         )`,
      [appointmentId, userId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Diesen Termin gibt es nicht.");
    return mapAppointment(row);
  }

  async cancel(appointmentId: string, userId: string): Promise<Appointment> {
    const result = await this.db.query<AppointmentRow>(
      `UPDATE appointments a
       SET status = 'CANCELLED'
       FROM offers o, requests r
       WHERE a.id = $1
         AND o.id = a.offer_id
         AND r.id = o.request_id
         AND a.status IN ('PROPOSED', 'CONFIRMED')
         AND (
           r.customer_id = $2
           OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = o.business_id AND bm.user_id = $2)
         )
       RETURNING a.*`,
      [appointmentId, userId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Diesen Termin gibt es nicht oder er ist bereits beendet.");
    return mapAppointment(row);
  }
}

/** Kombiniert ein Datum mit einer Uhrzeit "HH:MM[:SS]". */
function atTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}
