import type { Page, ServiceRequest, ServiceRequestDetail } from "@jobflow/types";
import type { Parsed } from "@jobflow/validation";
import type { createRequestSchema, updateRequestSchema } from "@jobflow/validation";
import type { Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { recordEvent } from "../analytics/audit.js";
import { mapRequest, mapRequestPhoto, type RequestPhotoRow, type RequestRow } from "./mapper.js";

export type CreateRequestData = Parsed<typeof createRequestSchema>;
export type UpdateRequestData = Parsed<typeof updateRequestSchema>;

/** Ab diesem Status ist eine Anfrage bei Unternehmen sichtbar und nicht mehr frei editierbar. */
const EDITABLE_STATUSES = new Set(["DRAFT", "ANALYZING", "OPEN"]);

export class RequestService {
  constructor(private readonly db: Db) {}

  async create(customerId: string, data: CreateRequestData): Promise<ServiceRequest> {
    if (data.categoryId !== null && data.categoryId !== undefined) {
      const known = await this.db.query("SELECT 1 FROM categories WHERE id = $1 AND active", [data.categoryId]);
      if (known.rowCount !== 1) {
        throw ApiError.validation({ categoryId: "Diese Kategorie gibt es nicht." });
      }
    }

    return withTransaction(this.db, async (client) => {
      const result = await client.query<RequestRow>(
        `INSERT INTO requests
           (customer_id, category_id, title, description, urgency,
            latitude, longitude, location_label, desired_from, desired_to, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DRAFT')
         RETURNING *`,
        [
          customerId,
          data.categoryId ?? null,
          data.title ?? null,
          data.description,
          data.urgency,
          data.latitude ?? null,
          data.longitude ?? null,
          data.locationLabel ?? null,
          data.desiredFrom ?? null,
          data.desiredTo ?? null,
        ],
      );

      const row = result.rows[0] as RequestRow;
      await recordEvent(client, {
        name: "request_created",
        userId: customerId,
        requestId: row.id,
        properties: { urgency: row.urgency, hasCategory: row.category_id !== null },
      });
      return mapRequest(row);
    });
  }

  /**
   * Liefert eine Anfrage nur an Berechtigte.
   *
   * Berechtigt sind der Kunde selbst und jedes Unternehmen, das zu dieser
   * Anfrage vorgeschlagen wurde. Wer keinen Bezug hat, bekommt 404 statt 403 -
   * sonst liesse sich ueber die Statuscodes erschliessen, welche Anfragen es gibt.
   */
  async getForUser(requestId: string, userId: string): Promise<ServiceRequestDetail> {
    const result = await this.db.query<RequestRow>(
      `SELECT r.*
       FROM requests r
       WHERE r.id = $1
         AND (
           r.customer_id = $2
           OR EXISTS (
             SELECT 1
             FROM matches m
             JOIN business_members bm ON bm.business_id = m.business_id
             WHERE m.request_id = r.id AND bm.user_id = $2
           )
         )`,
      [requestId, userId],
    );

    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Diese Anfrage gibt es nicht.");

    const photos = await this.db.query<RequestPhotoRow>(
      "SELECT * FROM request_photos WHERE request_id = $1 ORDER BY created_at",
      [requestId],
    );

    return { ...mapRequest(row), photos: photos.rows.map(mapRequestPhoto) };
  }

  /** Die Anfrage eines Kunden - fuer Aktionen, die nur ihm zustehen. */
  async getOwned(requestId: string, customerId: string): Promise<ServiceRequest> {
    const result = await this.db.query<RequestRow>(
      "SELECT * FROM requests WHERE id = $1 AND customer_id = $2",
      [requestId, customerId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Diese Anfrage gibt es nicht.");
    return mapRequest(row);
  }

  async listForCustomer(customerId: string, limit: number, offset: number): Promise<Page<ServiceRequest>> {
    const items = await this.db.query<RequestRow>(
      `SELECT * FROM requests
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limit, offset],
    );
    const total = await this.db.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM requests WHERE customer_id = $1",
      [customerId],
    );
    return {
      items: items.rows.map(mapRequest),
      total: Number(total.rows[0]?.count ?? "0"),
      limit,
      offset,
    };
  }

  async update(requestId: string, customerId: string, data: UpdateRequestData): Promise<ServiceRequest> {
    const existing = await this.getOwned(requestId, customerId);
    if (!EDITABLE_STATUSES.has(existing.status)) {
      throw ApiError.conflict(
        "Diese Anfrage laesst sich nicht mehr aendern - es liegen bereits Angebote vor.",
      );
    }

    // Nur die tatsaechlich uebergebenen Felder anfassen: ein PATCH soll nicht
    // stillschweigend Werte auf null setzen, die der Client gar nicht kannte.
    const columns: Record<string, unknown> = {};
    if (data.title !== undefined) columns["title"] = data.title;
    if (data.description !== undefined) columns["description"] = data.description;
    if (data.urgency !== undefined) columns["urgency"] = data.urgency;
    if (data.categoryId !== undefined) columns["category_id"] = data.categoryId;
    if (data.locationLabel !== undefined) columns["location_label"] = data.locationLabel;
    if (data.desiredFrom !== undefined) columns["desired_from"] = data.desiredFrom;
    if (data.desiredTo !== undefined) columns["desired_to"] = data.desiredTo;

    const keys = Object.keys(columns);
    if (keys.length === 0) return existing;

    const assignments = keys.map((key, index) => `${key} = $${index + 3}`).join(", ");
    const result = await this.db.query<RequestRow>(
      `UPDATE requests SET ${assignments} WHERE id = $1 AND customer_id = $2 RETURNING *`,
      [requestId, customerId, ...keys.map((key) => columns[key])],
    );
    return mapRequest(result.rows[0] as RequestRow);
  }

  /** Setzt den Status - nur innerhalb erlaubter Uebergaenge. */
  async setStatus(requestId: string, status: ServiceRequest["status"]): Promise<void> {
    await this.db.query("UPDATE requests SET status = $2 WHERE id = $1", [requestId, status]);
  }

  async cancel(requestId: string, customerId: string): Promise<ServiceRequest> {
    const existing = await this.getOwned(requestId, customerId);
    if (existing.status === "COMPLETED") {
      throw ApiError.conflict("Ein abgeschlossener Auftrag laesst sich nicht zurueckziehen.");
    }
    if (existing.status === "ACCEPTED") {
      throw ApiError.conflict(
        "Zu dieser Anfrage laeuft bereits ein Auftrag. Bitte sprich dich mit dem Unternehmen ab.",
      );
    }
    const result = await this.db.query<RequestRow>(
      "UPDATE requests SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
      [requestId],
    );
    return mapRequest(result.rows[0] as RequestRow);
  }
}
