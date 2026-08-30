import type { Review } from "@jobflow/types";
import type { Parsed } from "@jobflow/validation";
import type { createReviewSchema } from "@jobflow/validation";
import type { Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { recordEvent } from "../analytics/audit.js";

export type CreateReviewData = Parsed<typeof createReviewSchema>;

interface ReviewRow {
  id: string;
  job_id: string;
  customer_id: string;
  business_id: string;
  rating: number;
  text: string | null;
  created_at: Date;
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    jobId: row.job_id,
    customerId: row.customer_id,
    businessId: row.business_id,
    rating: row.rating,
    text: row.text,
    createdAt: row.created_at.toISOString(),
  };
}

export class ReviewService {
  constructor(private readonly db: Db) {}

  /**
   * Bewertet einen abgeschlossenen Auftrag.
   *
   * Bewerten darf nur der Kunde, nur einmal und nur nach Abschluss. Das ist
   * der einfachste wirksame Schutz gegen erfundene Bewertungen: ohne echten
   * Auftrag gibt es keine Bewertung.
   */
  async create(customerId: string, data: CreateReviewData): Promise<Review> {
    return withTransaction(this.db, async (client) => {
      const job = await client.query<{ id: string; business_id: string; status: string }>(
        "SELECT id, business_id, status FROM jobs WHERE id = $1 AND customer_id = $2",
        [data.jobId, customerId],
      );
      const jobRow = job.rows[0];
      if (jobRow === undefined) throw ApiError.notFound("Diesen Auftrag gibt es nicht.");
      if (jobRow.status !== "COMPLETED") {
        throw ApiError.conflict("Bewerten laesst sich erst ein abgeschlossener Auftrag.");
      }

      const inserted = await client.query<ReviewRow>(
        `INSERT INTO reviews (job_id, customer_id, business_id, rating, text)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (job_id) DO NOTHING
         RETURNING *`,
        [data.jobId, customerId, jobRow.business_id, data.rating, data.text ?? null],
      );
      const row = inserted.rows[0];
      if (row === undefined) throw ApiError.conflict("Dieser Auftrag wurde bereits bewertet.");

      // Durchschnitt und Anzahl am Unternehmen fortschreiben. Sonst muesste
      // das Matching bei jeder Anfrage alle Bewertungen zusammenrechnen.
      await client.query(
        `UPDATE businesses b
         SET rating = sub.avg_rating, review_count = sub.count
         FROM (
           SELECT round(avg(rating)::numeric, 2) AS avg_rating, count(*)::int AS count
           FROM reviews WHERE business_id = $1
         ) AS sub
         WHERE b.id = $1`,
        [jobRow.business_id],
      );

      await recordEvent(client, {
        name: "review_created",
        userId: customerId,
        businessId: jobRow.business_id,
        properties: { rating: data.rating, hasText: (data.text ?? null) !== null },
      });

      return mapReview(row);
    });
  }

  /** Oeffentliche Bewertungen eines Unternehmens. */
  async listForBusiness(businessId: string, limit: number, offset: number): Promise<Review[]> {
    const result = await this.db.query<ReviewRow>(
      "SELECT * FROM reviews WHERE business_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [businessId, limit, offset],
    );
    return result.rows.map(mapReview);
  }
}
