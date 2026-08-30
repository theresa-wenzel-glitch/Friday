import type { AiAnalysisDetail, AiAnalysis, AiQuestion, Urgency } from "@jobflow/types";
import { aiAnalysisResultSchema, validate } from "@jobflow/validation";
import type { Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { recordEvent } from "../analytics/audit.js";
import { AiUnavailableError, type AiProvider } from "./provider.js";

interface AnalysisRow {
  id: string;
  request_id: string;
  category_id: string | null;
  summary: string;
  urgency: Urgency;
  confidence: number;
  provider: string;
  created_at: Date;
}

interface QuestionRow {
  id: string;
  analysis_id: string;
  position: number;
  question: string;
  answer: string | null;
  answered_at: Date | null;
}

function mapAnalysis(row: AnalysisRow): AiAnalysis {
  return {
    id: row.id,
    requestId: row.request_id,
    categoryId: row.category_id,
    summary: row.summary,
    urgency: row.urgency,
    confidence: row.confidence,
    provider: row.provider,
    createdAt: row.created_at.toISOString(),
  };
}

function mapQuestion(row: QuestionRow): AiQuestion {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    position: row.position,
    question: row.question,
    answer: row.answer,
    answeredAt: row.answered_at === null ? null : row.answered_at.toISOString(),
  };
}

export class AiService {
  constructor(
    private readonly db: Db,
    private readonly provider: AiProvider,
  ) {}

  /**
   * Analysiert eine Anfrage und legt das Ergebnis ab.
   *
   * Der Ablauf ist bewusst so herum: App -> API -> KI -> Validierung -> Datenbank.
   * Die KI bekommt nur Text und liefert nur Text zurueck. Welche Kategorie
   * tatsaechlich gesetzt wird, entscheidet das Backend anhand der Kategorien,
   * die es wirklich gibt.
   */
  async analyze(requestId: string, customerId: string): Promise<AiAnalysisDetail> {
    const request = await this.db.query<{
      id: string;
      description: string;
      status: string;
      category_id: string | null;
    }>("SELECT id, description, status, category_id FROM requests WHERE id = $1 AND customer_id = $2", [
      requestId,
      customerId,
    ]);
    const row = request.rows[0];
    if (row === undefined) throw ApiError.notFound("Diese Anfrage gibt es nicht.");
    if (row.status === "CANCELLED" || row.status === "COMPLETED") {
      throw ApiError.conflict("Diese Anfrage ist abgeschlossen.");
    }

    const categories = await this.db.query<{ id: string; slug: string }>(
      "SELECT id, slug FROM categories WHERE active",
    );
    const slugToId = new Map(categories.rows.map((category) => [category.slug, category.id] as const));

    const answered = await this.db.query<{ question: string; answer: string }>(
      `SELECT q.question, q.answer
       FROM ai_questions q
       JOIN ai_analyses a ON a.id = q.analysis_id
       WHERE a.request_id = $1 AND q.answer IS NOT NULL
       ORDER BY a.created_at, q.position`,
      [requestId],
    );

    const photoCount = await this.db.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM request_photos WHERE request_id = $1",
      [requestId],
    );

    let raw: unknown;
    try {
      raw = await this.provider.analyze({
        description: row.description,
        knownCategorySlugs: [...slugToId.keys()],
        answeredQuestions: answered.rows,
        photoCount: Number(photoCount.rows[0]?.count ?? "0"),
      });
    } catch (error) {
      if (error instanceof AiUnavailableError) {
        throw new ApiError(503, "AI_UNAVAILABLE", "Die Analyse ist gerade nicht moeglich. Bitte versuche es erneut.");
      }
      throw error;
    }

    // Auch das Ergebnis des eigenen Providers wird geprueft. Wer hier eine
    // Ausnahme macht, hat die naechste Provider-Implementierung schon vergessen.
    const parsed = validate(aiAnalysisResultSchema, raw);
    if (!parsed.ok) {
      throw new ApiError(503, "AI_UNAVAILABLE", "Die Analyse lieferte kein verwertbares Ergebnis.");
    }

    const categoryId = parsed.value.categorySlug === null ? null : (slugToId.get(parsed.value.categorySlug) ?? null);

    return withTransaction(this.db, async (client) => {
      const analysis = await client.query<AnalysisRow>(
        `INSERT INTO ai_analyses (request_id, category_id, summary, urgency, confidence, provider)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [requestId, categoryId, parsed.value.summary, parsed.value.urgency, parsed.value.confidence, this.provider.name],
      );
      const analysisRow = analysis.rows[0] as AnalysisRow;

      const questions: QuestionRow[] = [];
      for (const [index, question] of parsed.value.questions.entries()) {
        const inserted = await client.query<QuestionRow>(
          `INSERT INTO ai_questions (analysis_id, position, question) VALUES ($1, $2, $3) RETURNING *`,
          [analysisRow.id, index, question],
        );
        questions.push(inserted.rows[0] as QuestionRow);
      }

      // Die Kategorie wird nur ergaenzt, nie ueberschrieben: hat der Kunde
      // selbst eine gewaehlt, wiegt das schwerer als ein Vorschlag der KI.
      if (categoryId !== null && row.category_id === null) {
        await client.query("UPDATE requests SET category_id = $2 WHERE id = $1", [requestId, categoryId]);
      }
      await client.query("UPDATE requests SET status = 'ANALYZING' WHERE id = $1 AND status = 'DRAFT'", [requestId]);

      await recordEvent(client, {
        name: "ai_analysis_completed",
        userId: customerId,
        requestId,
        properties: {
          provider: this.provider.name,
          confidence: parsed.value.confidence,
          questionCount: questions.length,
          categoryRecognised: categoryId !== null,
        },
      });

      return { ...mapAnalysis(analysisRow), questions: questions.map(mapQuestion) };
    });
  }

  /** Die juengste Analyse einer Anfrage. */
  async latest(requestId: string, userId: string): Promise<AiAnalysisDetail | null> {
    const analysis = await this.db.query<AnalysisRow>(
      `SELECT a.*
       FROM ai_analyses a
       JOIN requests r ON r.id = a.request_id
       WHERE a.request_id = $1
         AND (
           r.customer_id = $2
           OR EXISTS (
             SELECT 1 FROM matches m
             JOIN business_members bm ON bm.business_id = m.business_id
             WHERE m.request_id = r.id AND bm.user_id = $2
           )
         )
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [requestId, userId],
    );
    const row = analysis.rows[0];
    if (row === undefined) return null;

    const questions = await this.db.query<QuestionRow>(
      "SELECT * FROM ai_questions WHERE analysis_id = $1 ORDER BY position",
      [row.id],
    );
    return { ...mapAnalysis(row), questions: questions.rows.map(mapQuestion) };
  }

  /** Beantwortet eine Rueckfrage. Nur der Kunde der Anfrage darf das. */
  async answerQuestion(questionId: string, customerId: string, answer: string): Promise<AiQuestion> {
    const result = await this.db.query<QuestionRow>(
      `UPDATE ai_questions q
       SET answer = $3, answered_at = now()
       FROM ai_analyses a
       JOIN requests r ON r.id = a.request_id
       WHERE q.id = $1 AND q.analysis_id = a.id AND r.customer_id = $2
       RETURNING q.*`,
      [questionId, customerId, answer],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Diese Rueckfrage gibt es nicht.");
    return mapQuestion(row);
  }

  /**
   * Erzeugt einen Textvorschlag.
   *
   * Wichtig: der Vorschlag wird zurueckgegeben, nicht abgeschickt. Ueber Inhalt
   * und Versand entscheidet immer ein Mensch.
   */
  async suggestOfferText(context: string): Promise<string> {
    try {
      return await this.provider.suggestText({ kind: "OFFER_DESCRIPTION", context });
    } catch (error) {
      if (error instanceof AiUnavailableError) {
        throw new ApiError(503, "AI_UNAVAILABLE", "Der Textvorschlag ist gerade nicht moeglich.");
      }
      throw error;
    }
  }

  async suggestChatReply(context: string, hint?: string): Promise<string> {
    try {
      return await this.provider.suggestText({ kind: "CHAT_REPLY", context, ...(hint ? { hint } : {}) });
    } catch (error) {
      if (error instanceof AiUnavailableError) {
        throw new ApiError(503, "AI_UNAVAILABLE", "Der Textvorschlag ist gerade nicht moeglich.");
      }
      throw error;
    }
  }
}
