import type { Job, Offer, OfferStatus } from "@jobflow/types";
import type { Parsed } from "@jobflow/validation";
import type { createOfferSchema } from "@jobflow/validation";
import type { Db, DbClient } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { recordAudit, recordEvent } from "../analytics/audit.js";
import { mapJob, type JobRow } from "../jobs/mapper.js";
import type { BillingService } from "../billing/service.js";

export type CreateOfferData = Parsed<typeof createOfferSchema>;

export interface OfferRow {
  id: string;
  request_id: string;
  business_id: string;
  labor_cents: number;
  material_cents: number;
  travel_cents: number;
  total_cents: number;
  description: string;
  description_ai_assisted: boolean;
  valid_until: Date;
  status: OfferStatus;
  created_at: Date;
  updated_at: Date;
}

export function mapOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    requestId: row.request_id,
    businessId: row.business_id,
    laborCents: row.labor_cents,
    materialCents: row.material_cents,
    travelCents: row.travel_cents,
    totalCents: row.total_cents,
    description: row.description,
    descriptionAiAssisted: row.description_ai_assisted,
    validUntil: row.valid_until.toISOString(),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class OfferService {
  constructor(
    private readonly db: Db,
    private readonly billing: BillingService,
  ) {}

  /**
   * Ein Unternehmen gibt ein Angebot ab.
   *
   * Erlaubt ist das nur, wenn die Anfrage dem Unternehmen auch vorgeschlagen
   * wurde. Sonst könnte ein Betrieb fremde Anfragen abgreifen, indem er IDs
   * durchprobiert.
   */
  async create(businessId: string, userId: string, data: CreateOfferData): Promise<Offer> {
    const validUntil = new Date(data.validUntil);
    if (validUntil.getTime() <= Date.now()) {
      throw ApiError.validation({ validUntil: "Das Angebot muss in der Zukunft gültig sein." });
    }

    return withTransaction(this.db, async (client) => {
      const request = await client.query<{ id: string; status: string; customer_id: string; created_at: Date }>(
        `SELECT r.id, r.status, r.customer_id, r.created_at
         FROM requests r
         JOIN matches m ON m.request_id = r.id
         WHERE r.id = $1 AND m.business_id = $2
         FOR UPDATE OF r`,
        [data.requestId, businessId],
      );
      const requestRow = request.rows[0];
      if (requestRow === undefined) {
        throw ApiError.notFound("Diese Anfrage gibt es nicht.");
      }
      if (["ACCEPTED", "COMPLETED", "CANCELLED"].includes(requestRow.status)) {
        throw ApiError.conflict("Diese Anfrage nimmt keine Angebote mehr an.");
      }

      // Guthaben prüfen und verbrauchen, bevor das Angebot entsteht - im
      // selben Client wie der Rest. Zwei gleichzeitige Angebote sähen sonst
      // beide die letzte freie Stelle.
      const bereitsAbgegeben = await client.query(
        "SELECT 1 FROM offers WHERE request_id = $1 AND business_id = $2",
        [data.requestId, businessId],
      );
      // Ein überarbeitetes Angebot zur selben Anfrage zählt nicht erneut:
      // sonst kostete jede Korrektur ein weiteres Kontingent.
      if (bereitsAbgegeben.rowCount === 0) {
        await this.billing.consumeOffer(client, businessId);
      }

      const inserted = await client.query<OfferRow>(
        `INSERT INTO offers
           (request_id, business_id, labor_cents, material_cents, travel_cents,
            description, description_ai_assisted, valid_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (request_id, business_id) DO UPDATE
           SET labor_cents = EXCLUDED.labor_cents,
               material_cents = EXCLUDED.material_cents,
               travel_cents = EXCLUDED.travel_cents,
               description = EXCLUDED.description,
               description_ai_assisted = EXCLUDED.description_ai_assisted,
               valid_until = EXCLUDED.valid_until,
               status = 'PENDING'
           WHERE offers.status IN ('PENDING', 'WITHDRAWN', 'EXPIRED')
         RETURNING *`,
        [
          data.requestId,
          businessId,
          data.laborCents,
          data.materialCents,
          data.travelCents,
          data.description,
          data.descriptionAiAssisted,
          validUntil.toISOString(),
        ],
      );

      const row = inserted.rows[0];
      if (row === undefined) {
        // Die WHERE-Klausel des Upserts hat gegriffen: es gibt bereits ein
        // angenommenes oder abgelehntes Angebot, das nicht überschrieben wird.
        throw ApiError.conflict("Zu dieser Anfrage liegt bereits ein abgeschlossenes Angebot vor.");
      }

      await client.query(
        "UPDATE requests SET status = 'OFFERED' WHERE id = $1 AND status IN ('OPEN', 'MATCHING', 'ANALYZING', 'DRAFT')",
        [data.requestId],
      );
      await client.query("UPDATE matches SET status = 'ACCEPTED' WHERE request_id = $1 AND business_id = $2", [
        data.requestId,
        businessId,
      ]);

      // Antwortzeit fortschreiben - sie fließt ins Matching ein und steht im
      // Dashboard des Unternehmens.
      await this.updateResponseTime(client, businessId);

      await recordEvent(client, {
        name: "offer_created",
        userId,
        requestId: data.requestId,
        businessId,
        properties: { totalCents: row.total_cents, aiAssisted: row.description_ai_assisted },
      });

      // Zu jedem Angebot gehört ein Gesprächsfaden. Er entsteht hier, damit
      // Kunde und Unternehmen sofort Rückfragen stellen können.
      await client.query(
        `INSERT INTO conversations (request_id, business_id, customer_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (request_id, business_id) DO NOTHING`,
        [data.requestId, businessId, requestRow.customer_id],
      );

      return mapOffer(row);
    });
  }

  async get(offerId: string, userId: string): Promise<Offer> {
    const result = await this.db.query<OfferRow>(
      `SELECT o.*
       FROM offers o
       JOIN requests r ON r.id = o.request_id
       WHERE o.id = $1
         AND (
           r.customer_id = $2
           OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = o.business_id AND bm.user_id = $2)
         )`,
      [offerId, userId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Dieses Angebot gibt es nicht.");
    return mapOffer(row);
  }

  /** Alle Angebote zu einer Anfrage - das sieht nur der Kunde. */
  async listForRequest(requestId: string, customerId: string): Promise<Offer[]> {
    const result = await this.db.query<OfferRow>(
      `SELECT o.*
       FROM offers o
       JOIN requests r ON r.id = o.request_id
       WHERE o.request_id = $1 AND r.customer_id = $2
       ORDER BY o.total_cents ASC`,
      [requestId, customerId],
    );
    return result.rows.map(mapOffer);
  }

  /** Die eigenen Angebote eines Unternehmens. */
  async listForBusiness(businessId: string, limit: number, offset: number): Promise<Offer[]> {
    const result = await this.db.query<OfferRow>(
      "SELECT * FROM offers WHERE business_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [businessId, limit, offset],
    );
    return result.rows.map(mapOffer);
  }

  /**
   * Der Kunde nimmt ein Angebot an.
   *
   * Das ist der wichtigste Zustandswechsel der Plattform, und er betrifft
   * mehrere Tabellen: Angebot annehmen, übrige Angebote ablehnen, Anfrage
   * umstellen, Auftrag anlegen. Entweder alles oder nichts - ein halb
   * angenommenes Angebot wäre für beide Seiten ein echtes Problem.
   */
  async accept(offerId: string, customerId: string, ipPrefix: string): Promise<{ offer: Offer; job: Job }> {
    return withTransaction(this.db, async (client) => {
      const found = await client.query<OfferRow & { customer_id: string; request_status: string }>(
        `SELECT o.*, r.customer_id, r.status AS request_status
         FROM offers o
         JOIN requests r ON r.id = o.request_id
         WHERE o.id = $1 AND r.customer_id = $2
         FOR UPDATE OF o, r`,
        [offerId, customerId],
      );
      const offer = found.rows[0];
      if (offer === undefined) throw ApiError.notFound("Dieses Angebot gibt es nicht.");

      if (offer.status !== "PENDING") {
        throw ApiError.conflict("Dieses Angebot ist nicht mehr offen.");
      }
      if (offer.valid_until.getTime() <= Date.now()) {
        await client.query("UPDATE offers SET status = 'EXPIRED' WHERE id = $1", [offerId]);
        throw ApiError.conflict("Dieses Angebot ist abgelaufen.");
      }
      if (offer.request_status === "ACCEPTED" || offer.request_status === "COMPLETED") {
        throw ApiError.conflict("Zu dieser Anfrage wurde bereits ein Angebot angenommen.");
      }

      const accepted = await client.query<OfferRow>(
        "UPDATE offers SET status = 'ACCEPTED' WHERE id = $1 RETURNING *",
        [offerId],
      );

      // Die übrigen Angebote werden abgelehnt - sonst blieben sie für die
      // anderen Unternehmen unbeantwortet stehen.
      await client.query(
        "UPDATE offers SET status = 'DECLINED' WHERE request_id = $1 AND id <> $2 AND status = 'PENDING'",
        [offer.request_id, offerId],
      );
      await client.query("UPDATE requests SET status = 'ACCEPTED' WHERE id = $1", [offer.request_id]);

      const job = await client.query<JobRow>(
        `INSERT INTO jobs (offer_id, request_id, business_id, customer_id, status)
         VALUES ($1, $2, $3, $4, 'SCHEDULED')
         RETURNING *`,
        [offerId, offer.request_id, offer.business_id, customerId],
      );

      await client.query(
        `INSERT INTO conversations (request_id, business_id, customer_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (request_id, business_id) DO NOTHING`,
        [offer.request_id, offer.business_id, customerId],
      );

      await recordEvent(client, {
        name: "offer_accepted",
        userId: customerId,
        requestId: offer.request_id,
        businessId: offer.business_id,
        properties: { totalCents: offer.total_cents },
      });
      await recordAudit(client, {
        actorId: customerId,
        action: "offer.accepted",
        entityType: "offer",
        entityId: offerId,
        ipPrefix,
        detail: { totalCents: offer.total_cents, businessId: offer.business_id },
      });

      return {
        offer: mapOffer(accepted.rows[0] as OfferRow),
        job: mapJob(job.rows[0] as JobRow),
      };
    });
  }

  async decline(offerId: string, customerId: string): Promise<Offer> {
    const result = await this.db.query<OfferRow>(
      `UPDATE offers o
       SET status = 'DECLINED'
       FROM requests r
       WHERE o.id = $1 AND o.request_id = r.id AND r.customer_id = $2 AND o.status = 'PENDING'
       RETURNING o.*`,
      [offerId, customerId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Dieses Angebot gibt es nicht oder ist nicht mehr offen.");
    return mapOffer(row);
  }

  /** Das Unternehmen zieht sein Angebot zurück. */
  async withdraw(offerId: string, businessId: string): Promise<Offer> {
    const result = await this.db.query<OfferRow>(
      "UPDATE offers SET status = 'WITHDRAWN' WHERE id = $1 AND business_id = $2 AND status = 'PENDING' RETURNING *",
      [offerId, businessId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw ApiError.conflict("Dieses Angebot lässt sich nicht mehr zurückziehen.");
    }
    return mapOffer(row);
  }

  /**
   * Schreibt die durchschnittliche Antwortzeit fort.
   *
   * Gemessen wird die Spanne zwischen dem Vorschlag der Anfrage und dem
   * Angebot. Der Median wäre robuster gegen Ausreißer - dafür braucht es
   * aber erst genug Daten, um ihn sinnvoll zu berechnen.
   */
  private async updateResponseTime(client: DbClient, businessId: string): Promise<void> {
    await client.query(
      `UPDATE businesses b
       SET avg_response_minutes = sub.minutes
       FROM (
         SELECT round(avg(extract(epoch FROM o.created_at - m.created_at) / 60))::int AS minutes
         FROM offers o
         JOIN matches m ON m.request_id = o.request_id AND m.business_id = o.business_id
         WHERE o.business_id = $1
       ) AS sub
       WHERE b.id = $1 AND sub.minutes IS NOT NULL`,
      [businessId],
    );
  }
}
