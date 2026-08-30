import type { Match, MatchWithBusiness } from "@jobflow/types";
import type { Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { recordEvent } from "../analytics/audit.js";
import { mapBusiness, type BusinessRow } from "../businesses/mapper.js";
import { scoreCandidate, type CandidateInput } from "./engine.js";

/** Wie viele Unternehmen hoechstens vorgeschlagen werden. */
const MAX_MATCHES = 10;
/** Unterhalb dieses Scores lohnt sich der Vorschlag nicht. */
const MIN_SCORE = 25;

interface CandidateRow {
  business_id: string;
  matches_category: boolean;
  matches_parent_category: boolean;
  distance_km: number | null;
  service_radius_km: number;
  has_availability: boolean;
  rating: number | null;
  review_count: number;
  completed_job_count: number;
  avg_response_minutes: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  verified: boolean;
}

interface MatchRow {
  id: string;
  request_id: string;
  business_id: string;
  score: number;
  reasons: Match["reasons"];
  distance_km: number | null;
  status: Match["status"];
  created_at: Date;
}

function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    requestId: row.request_id,
    businessId: row.business_id,
    score: row.score,
    reasons: row.reasons,
    distanceKm: row.distance_km,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export class MatchingService {
  constructor(private readonly db: Db) {}

  /**
   * Ermittelt passende Unternehmen und speichert sie als Matches.
   *
   * Die Datenbank uebernimmt nur die Vorauswahl - Kategorie, Umkreis,
   * Verfuegbarkeit. Bewertet wird danach in der Engine, damit sich die
   * Gewichtung aendern laesst, ohne SQL anzufassen.
   */
  async generate(requestId: string, customerId: string): Promise<MatchWithBusiness[]> {
    const request = await this.db.query<{
      id: string;
      category_id: string | null;
      latitude: number | null;
      longitude: number | null;
      status: string;
    }>("SELECT id, category_id, latitude, longitude, status FROM requests WHERE id = $1 AND customer_id = $2", [
      requestId,
      customerId,
    ]);
    const row = request.rows[0];
    if (row === undefined) throw ApiError.notFound("Diese Anfrage gibt es nicht.");
    if (row.category_id === null) {
      throw ApiError.conflict(
        "Zu dieser Anfrage steht noch keine Kategorie fest. Bitte zuerst die Analyse durchfuehren.",
      );
    }
    if (row.status === "CANCELLED" || row.status === "COMPLETED") {
      throw ApiError.conflict("Diese Anfrage ist abgeschlossen.");
    }

    const candidates = await this.loadCandidates(row.id, row.category_id, row.latitude, row.longitude);
    if (candidates.length === 0) return [];

    // Bezugspreis fuer den Preisfaktor: der Median der angebotenen Spannen.
    // Ein Mittelwert waere durch einzelne Ausreisser leicht zu verzerren.
    const referencePriceCents = medianPrice(candidates);

    const scored = candidates
      .map((candidate) => scoreCandidate(toEngineInput(candidate), { referencePriceCents }))
      .filter((candidate) => candidate.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHES);

    if (scored.length === 0) return [];

    return withTransaction(this.db, async (client) => {
      const stored: MatchRow[] = [];
      for (const candidate of scored) {
        const result = await client.query<MatchRow>(
          `INSERT INTO matches (request_id, business_id, score, reasons, distance_km, status)
           VALUES ($1, $2, $3, $4::jsonb, $5, 'NOTIFIED')
           ON CONFLICT (request_id, business_id)
           DO UPDATE SET score = EXCLUDED.score, reasons = EXCLUDED.reasons, distance_km = EXCLUDED.distance_km
           RETURNING *`,
          [
            requestId,
            candidate.businessId,
            candidate.score,
            JSON.stringify(candidate.reasons),
            candidate.distanceKm,
          ],
        );
        stored.push(result.rows[0] as MatchRow);
      }

      // Erst wenn tatsaechlich jemand gefunden wurde, wechselt die Anfrage in
      // den Status MATCHING. Ein "wir suchen" ohne Ergebnis waere irrefuehrend.
      await client.query(
        "UPDATE requests SET status = 'MATCHING' WHERE id = $1 AND status IN ('DRAFT', 'ANALYZING', 'OPEN')",
        [requestId],
      );

      await recordEvent(client, {
        name: "match_generated",
        userId: customerId,
        requestId,
        properties: { count: stored.length, topScore: stored[0]?.score ?? 0 },
      });

      const businesses = await client.query<BusinessRow>(
        "SELECT * FROM businesses WHERE id = ANY($1::uuid[])",
        [stored.map((match) => match.business_id)],
      );
      const byId = new Map(businesses.rows.map((business) => [business.id, business] as const));

      return stored
        .map((match) => {
          const business = byId.get(match.business_id);
          return business === undefined ? null : { ...mapMatch(match), business: mapBusiness(business) };
        })
        .filter((match): match is MatchWithBusiness => match !== null);
    });
  }

  /** Die gespeicherten Vorschlaege zu einer Anfrage - nur fuer den Kunden. */
  async listForRequest(requestId: string, customerId: string): Promise<MatchWithBusiness[]> {
    const result = await this.db.query<MatchRow & { business: BusinessRow }>(
      `SELECT m.*, to_jsonb(b.*) AS business
       FROM matches m
       JOIN businesses b ON b.id = m.business_id
       JOIN requests r ON r.id = m.request_id
       WHERE m.request_id = $1 AND r.customer_id = $2
       ORDER BY m.score DESC`,
      [requestId, customerId],
    );
    return result.rows.map((row) => ({
      ...mapMatch(row),
      // to_jsonb liefert Zeitstempel als ISO-String; der Mapper erwartet Date.
      business: mapBusiness(reviveDates(row.business)),
    }));
  }

  /** Die Anfragen, die einem Unternehmen vorgeschlagen wurden. */
  async listForBusiness(businessId: string, limit: number, offset: number): Promise<Match[]> {
    const result = await this.db.query<MatchRow>(
      `SELECT m.*
       FROM matches m
       JOIN requests r ON r.id = m.request_id
       WHERE m.business_id = $1
         AND r.status NOT IN ('CANCELLED', 'COMPLETED')
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, limit, offset],
    );
    return result.rows.map(mapMatch);
  }

  /** Das Unternehmen nimmt eine Anfrage an oder lehnt sie ab. */
  async respond(matchId: string, businessId: string, status: "ACCEPTED" | "DECLINED"): Promise<Match> {
    const result = await this.db.query<MatchRow>(
      "UPDATE matches SET status = $3 WHERE id = $1 AND business_id = $2 RETURNING *",
      [matchId, businessId, status],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Diese Anfrage gibt es nicht.");
    return mapMatch(row);
  }

  private async loadCandidates(
    requestId: string,
    categoryId: string,
    latitude: number | null,
    longitude: number | null,
  ): Promise<CandidateRow[]> {
    // Die Vorauswahl nimmt alle Betriebe mit, die die Kategorie oder deren
    // Oberkategorie anbieten. Die Feinbewertung passiert danach in der Engine.
    const result = await this.db.query<CandidateRow>(
      `WITH target AS (
         SELECT id, parent_id FROM categories WHERE id = $2
       )
       SELECT
         b.id AS business_id,
         bool_or(s.category_id = t.id) AS matches_category,
         bool_or(t.parent_id IS NOT NULL AND s.category_id = t.parent_id) AS matches_parent_category,
         jobflow_distance_km($3, $4, b.latitude, b.longitude) AS distance_km,
         b.service_radius_km,
         EXISTS (SELECT 1 FROM business_availability a WHERE a.business_id = b.id) AS has_availability,
         b.rating,
         b.review_count,
         b.completed_job_count,
         b.avg_response_minutes,
         min(s.price_min_cents) AS price_min_cents,
         max(s.price_max_cents) AS price_max_cents,
         b.verified
       FROM businesses b
       JOIN business_services s ON s.business_id = b.id AND s.active
       CROSS JOIN target t
       WHERE (s.category_id = t.id OR (t.parent_id IS NOT NULL AND s.category_id = t.parent_id))
         -- Betriebe, die bereits abgelehnt haben, nicht erneut vorschlagen.
         AND NOT EXISTS (
           SELECT 1 FROM matches m
           WHERE m.request_id = $1 AND m.business_id = b.id AND m.status = 'DECLINED'
         )
       GROUP BY b.id
       -- Ausserhalb des Einsatzradius braucht die Engine gar nicht erst zu rechnen.
       HAVING jobflow_distance_km($3, $4, b.latitude, b.longitude) IS NULL
           OR jobflow_distance_km($3, $4, b.latitude, b.longitude) <= b.service_radius_km`,
      [requestId, categoryId, latitude, longitude],
    );
    return result.rows;
  }
}

function toEngineInput(row: CandidateRow): CandidateInput {
  return {
    businessId: row.business_id,
    matchesCategory: row.matches_category === true,
    matchesParentCategory: row.matches_parent_category === true,
    distanceKm: row.distance_km,
    serviceRadiusKm: row.service_radius_km,
    hasAvailability: row.has_availability === true,
    rating: row.rating,
    reviewCount: row.review_count,
    completedJobCount: row.completed_job_count,
    avgResponseMinutes: row.avg_response_minutes,
    priceMinCents: row.price_min_cents,
    priceMaxCents: row.price_max_cents,
    verified: row.verified,
  };
}

function medianPrice(candidates: CandidateRow[]): number | null {
  const values = candidates
    .map((candidate) => {
      const { price_min_cents: min, price_max_cents: max } = candidate;
      if (min !== null && max !== null) return (min + max) / 2;
      return min ?? max;
    })
    .filter((value): value is number => value !== null && value > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? (values[middle] as number)
    : ((values[middle - 1] as number) + (values[middle] as number)) / 2;
}

/** to_jsonb liefert Zeitstempel als String zurueck - der Mapper erwartet Date. */
function reviveDates(row: BusinessRow): BusinessRow {
  return {
    ...row,
    verified_at: row.verified_at === null ? null : new Date(row.verified_at),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
