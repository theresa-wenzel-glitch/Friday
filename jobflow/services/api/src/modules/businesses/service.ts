import type { AvailabilitySlot, Business, BusinessService as BusinessServiceEntity } from "@jobflow/types";
import type { Parsed } from "@jobflow/validation";
import type { availabilityScheduleSchema, businessProfileSchema, businessServiceSchema } from "@jobflow/validation";
import type { Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { mapBusiness, type BusinessRow } from "./mapper.js";

export type BusinessProfileData = Parsed<typeof businessProfileSchema>;
export type BusinessServiceData = Parsed<typeof businessServiceSchema>;
export type AvailabilityData = Parsed<typeof availabilityScheduleSchema>;

interface ServiceRow {
  id: string;
  business_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  active: boolean;
  created_at: Date;
}

interface AvailabilityRow {
  id: string;
  business_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

function mapService(row: ServiceRow): BusinessServiceEntity {
  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    priceMinCents: row.price_min_cents,
    priceMaxCents: row.price_max_cents,
    active: row.active,
    createdAt: row.created_at.toISOString(),
  };
}

function mapAvailability(row: AvailabilityRow): AvailabilitySlot {
  return {
    id: row.id,
    businessId: row.business_id,
    weekday: row.weekday,
    // PostgreSQL liefert time als "HH:MM:SS" - die API arbeitet mit "HH:MM".
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
  };
}

export class BusinessService {
  constructor(private readonly db: Db) {}

  /**
   * Das Unternehmen des angemeldeten Nutzers.
   *
   * Diese Methode ist der Angelpunkt der Zugriffskontrolle auf der
   * Unternehmensseite: jede Aktion eines Betriebs geht ueber die hier
   * ermittelte businessId. Ein Unternehmen kann damit gar nicht erst die Daten
   * eines anderen anfragen.
   */
  async requireMembership(userId: string): Promise<{ businessId: string; role: "OWNER" | "MEMBER" }> {
    const result = await this.db.query<{ business_id: string; role: "OWNER" | "MEMBER" }>(
      "SELECT business_id, role FROM business_members WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw ApiError.forbidden("Zu diesem Konto gehoert kein Unternehmen.");
    }
    return { businessId: row.business_id, role: row.role };
  }

  /** Aktionen, die dem Inhaber vorbehalten sind (Profil, Leistungen, Mitarbeiter). */
  async requireOwner(userId: string): Promise<string> {
    const membership = await this.requireMembership(userId);
    if (membership.role !== "OWNER") {
      throw ApiError.forbidden("Das darf nur der Inhaber des Unternehmens.");
    }
    return membership.businessId;
  }

  async get(businessId: string): Promise<Business> {
    const result = await this.db.query<BusinessRow>("SELECT * FROM businesses WHERE id = $1", [businessId]);
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Dieses Unternehmen gibt es nicht.");
    return mapBusiness(row);
  }

  async updateProfile(businessId: string, data: BusinessProfileData): Promise<Business> {
    const result = await this.db.query<BusinessRow>(
      `UPDATE businesses
       SET name = $2, description = $3, latitude = $4, longitude = $5, service_radius_km = $6
       WHERE id = $1
       RETURNING *`,
      [
        businessId,
        data.name,
        data.description ?? null,
        data.latitude ?? null,
        data.longitude ?? null,
        data.serviceRadiusKm,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Dieses Unternehmen gibt es nicht.");
    return mapBusiness(row);
  }

  async listServices(businessId: string): Promise<BusinessServiceEntity[]> {
    const result = await this.db.query<ServiceRow>(
      "SELECT * FROM business_services WHERE business_id = $1 AND active ORDER BY name",
      [businessId],
    );
    return result.rows.map(mapService);
  }

  async addService(businessId: string, data: BusinessServiceData): Promise<BusinessServiceEntity> {
    const known = await this.db.query("SELECT 1 FROM categories WHERE id = $1 AND active", [data.categoryId]);
    if (known.rowCount !== 1) {
      throw ApiError.validation({ categoryId: "Diese Kategorie gibt es nicht." });
    }

    const result = await this.db.query<ServiceRow>(
      `INSERT INTO business_services (business_id, category_id, name, description, price_min_cents, price_max_cents)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (business_id, category_id) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             price_min_cents = EXCLUDED.price_min_cents,
             price_max_cents = EXCLUDED.price_max_cents,
             active = true
       RETURNING *`,
      [
        businessId,
        data.categoryId,
        data.name,
        data.description ?? null,
        data.priceMinCents ?? null,
        data.priceMaxCents ?? null,
      ],
    );
    return mapService(result.rows[0] as ServiceRow);
  }

  async removeService(businessId: string, serviceId: string): Promise<void> {
    // Nicht loeschen, sondern deaktivieren: bestehende Anfragen und Angebote
    // verweisen darauf, und ihre Geschichte soll nachvollziehbar bleiben.
    const result = await this.db.query(
      "UPDATE business_services SET active = false WHERE id = $1 AND business_id = $2",
      [serviceId, businessId],
    );
    if (result.rowCount === 0) throw ApiError.notFound("Diese Leistung gibt es nicht.");
  }

  async getAvailability(businessId: string): Promise<AvailabilitySlot[]> {
    const result = await this.db.query<AvailabilityRow>(
      "SELECT * FROM business_availability WHERE business_id = $1 ORDER BY weekday, start_time",
      [businessId],
    );
    return result.rows.map(mapAvailability);
  }

  /** Ersetzt den kompletten Wochenplan. */
  async setAvailability(businessId: string, data: AvailabilityData): Promise<AvailabilitySlot[]> {
    return withTransaction(this.db, async (client) => {
      await client.query("DELETE FROM business_availability WHERE business_id = $1", [businessId]);
      const rows: AvailabilityRow[] = [];
      for (const slot of data.slots) {
        const inserted = await client.query<AvailabilityRow>(
          `INSERT INTO business_availability (business_id, weekday, start_time, end_time)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING
           RETURNING *`,
          [businessId, slot.weekday, slot.startTime, slot.endTime],
        );
        const row = inserted.rows[0];
        if (row !== undefined) rows.push(row);
      }
      return rows.map(mapAvailability);
    });
  }

  /** Kennzahlen fuer das Dashboard eines Unternehmens. */
  async statistics(businessId: string): Promise<{
    matchCount: number;
    offerCount: number;
    jobCount: number;
    offerRate: number;
    winRate: number;
    avgResponseMinutes: number | null;
    rating: number | null;
    reviewCount: number;
  }> {
    const result = await this.db.query<{
      match_count: string;
      offer_count: string;
      job_count: string;
      avg_response_minutes: number | null;
      rating: number | null;
      review_count: number;
    }>(
      `SELECT
         (SELECT count(*) FROM matches WHERE business_id = $1)::text AS match_count,
         (SELECT count(*) FROM offers WHERE business_id = $1)::text AS offer_count,
         (SELECT count(*) FROM jobs WHERE business_id = $1)::text AS job_count,
         b.avg_response_minutes,
         b.rating,
         b.review_count
       FROM businesses b WHERE b.id = $1`,
      [businessId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Dieses Unternehmen gibt es nicht.");

    const matchCount = Number(row.match_count);
    const offerCount = Number(row.offer_count);
    const jobCount = Number(row.job_count);

    return {
      matchCount,
      offerCount,
      jobCount,
      // Anteil der Anfragen, auf die tatsaechlich ein Angebot folgte.
      offerRate: matchCount === 0 ? 0 : Math.round((offerCount / matchCount) * 100),
      // Anteil der Angebote, die zu einem Auftrag wurden.
      winRate: offerCount === 0 ? 0 : Math.round((jobCount / offerCount) * 100),
      avgResponseMinutes: row.avg_response_minutes,
      rating: row.rating,
      reviewCount: row.review_count,
    };
  }
}
