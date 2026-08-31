import type { Job, JobStatus } from "@jobflow/types";
import type { Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { recordEvent } from "../analytics/audit.js";
import { mapJob, type JobRow } from "./mapper.js";

/**
 * Erlaubte Statuswechsel eines Auftrags.
 *
 * Ohne diese Tabelle ließe sich ein abgeschlossener Auftrag über die API
 * wieder auf "geplant" zurücksetzen - und damit eine zweite Bewertung
 * ermöglichen.
 */
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export class JobService {
  constructor(private readonly db: Db) {}

  async get(jobId: string, userId: string): Promise<Job> {
    const result = await this.db.query<JobRow>(
      `SELECT j.*
       FROM jobs j
       WHERE j.id = $1
         AND (
           j.customer_id = $2
           OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = j.business_id AND bm.user_id = $2)
         )`,
      [jobId, userId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Diesen Auftrag gibt es nicht.");
    return mapJob(row);
  }

  async listForUser(userId: string, limit: number, offset: number): Promise<Job[]> {
    const result = await this.db.query<JobRow>(
      `SELECT j.*
       FROM jobs j
       WHERE j.customer_id = $1
          OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = j.business_id AND bm.user_id = $1)
       ORDER BY j.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return result.rows.map(mapJob);
  }

  /**
   * Ändert den Status eines Auftrags.
   *
   * Den Fortschritt meldet das ausführende Unternehmen; abbrechen dürfen
   * beide Seiten. Ein Kunde soll einen Auftrag nicht selbst als erledigt
   * markieren können - das ist die Aussage des Betriebs.
   */
  async setStatus(jobId: string, userId: string, status: JobStatus): Promise<Job> {
    return withTransaction(this.db, async (client) => {
      const found = await client.query<JobRow & { is_business: boolean }>(
        `SELECT j.*,
                EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = j.business_id AND bm.user_id = $2) AS is_business
         FROM jobs j
         WHERE j.id = $1
           AND (
             j.customer_id = $2
             OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = j.business_id AND bm.user_id = $2)
           )
         FOR UPDATE OF j`,
        [jobId, userId],
      );
      const row = found.rows[0];
      if (row === undefined) throw ApiError.notFound("Diesen Auftrag gibt es nicht.");

      if (!ALLOWED_TRANSITIONS[row.status].includes(status)) {
        throw ApiError.conflict(
          `Der Wechsel von "${row.status}" nach "${status}" ist nicht vorgesehen.`,
        );
      }
      if (status !== "CANCELLED" && !row.is_business) {
        throw ApiError.forbidden("Den Fortschritt meldet das ausführende Unternehmen.");
      }

      const updated = await client.query<JobRow>(
        `UPDATE jobs
         SET status = $2,
             started_at = CASE WHEN $2 = 'IN_PROGRESS' AND started_at IS NULL THEN now() ELSE started_at END,
             completed_at = CASE WHEN $2 = 'COMPLETED' THEN now() ELSE completed_at END
         WHERE id = $1
         RETURNING *`,
        [jobId, status],
      );

      if (status === "COMPLETED") {
        await client.query("UPDATE requests SET status = 'COMPLETED' WHERE id = $1", [row.request_id]);
        await client.query(
          "UPDATE appointments SET status = 'COMPLETED' WHERE offer_id = $1 AND status = 'CONFIRMED'",
          [row.offer_id],
        );
        // Erfahrung fortschreiben - sie fließt ins Matching ein.
        await client.query(
          "UPDATE businesses SET completed_job_count = completed_job_count + 1 WHERE id = $1",
          [row.business_id],
        );
        await recordEvent(client, {
          name: "job_completed",
          userId,
          requestId: row.request_id,
          businessId: row.business_id,
        });
      }

      if (status === "CANCELLED") {
        await client.query(
          "UPDATE appointments SET status = 'CANCELLED' WHERE offer_id = $1 AND status IN ('PROPOSED', 'CONFIRMED')",
          [row.offer_id],
        );
      }

      return mapJob(updated.rows[0] as JobRow);
    });
  }
}
