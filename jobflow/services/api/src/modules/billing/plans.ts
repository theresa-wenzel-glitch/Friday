import type { PlanCode, SubscriptionPlan } from "@jobflow/types";
import type { Db } from "../../db/pool.js";

interface PlanRow {
  code: PlanCode;
  name: string;
  price_cents: number;
  currency: string;
  monthly_offer_limit: number | null;
  ai_assistant: boolean;
  calendar: boolean;
  statistics: boolean;
  multi_user: boolean;
  position: number;
}

export function mapPlan(row: PlanRow): SubscriptionPlan {
  return {
    code: row.code,
    name: row.name,
    priceCents: row.price_cents,
    currency: row.currency,
    monthlyOfferLimit: row.monthly_offer_limit,
    aiAssistant: row.ai_assistant,
    calendar: row.calendar,
    statistics: row.statistics,
    multiUser: row.multi_user,
    position: row.position,
  };
}

/**
 * Die Pakete kommen aus der Datenbank, nicht aus dem Code.
 *
 * Sie ändern sich selten, werden aber bei praktisch jeder Anfrage eines
 * Betriebs gebraucht - deshalb ein kleiner Zwischenspeicher mit kurzer
 * Lebensdauer. Eine Preisänderung wirkt damit spätestens nach einer Minute,
 * ohne dass die Anwendung neu starten muss.
 */
export class PlanCatalog {
  private cache: { plans: SubscriptionPlan[]; bis: number } | null = null;
  private static readonly TTL_MS = 60_000;

  constructor(private readonly db: Db) {}

  async list(): Promise<SubscriptionPlan[]> {
    if (this.cache !== null && this.cache.bis > Date.now()) return this.cache.plans;
    const result = await this.db.query<PlanRow>(
      "SELECT * FROM subscription_plans WHERE active ORDER BY position",
    );
    const plans = result.rows.map(mapPlan);
    this.cache = { plans, bis: Date.now() + PlanCatalog.TTL_MS };
    return plans;
  }

  async byCode(code: PlanCode): Promise<SubscriptionPlan | null> {
    return (await this.list()).find((plan) => plan.code === code) ?? null;
  }

  /**
   * Das Paket, das gilt, wenn kein Abo besteht.
   *
   * Fehlt sogar Free in der Datenbank, wird nicht geraten: ohne bekanntes
   * Paket lässt sich kein Guthaben prüfen, und ein stillschweigend
   * angenommenes "unbegrenzt" wäre der teuerste mögliche Fehler.
   */
  async fallback(): Promise<SubscriptionPlan> {
    const free = await this.byCode("FREE");
    if (free === null) {
      throw new Error(
        "Das Paket FREE fehlt in der Datenbank. Bitte die Seeds einspielen (pnpm db:seed).",
      );
    }
    return free;
  }

  /** Nur für Tests: den Zwischenspeicher verwerfen. */
  invalidate(): void {
    this.cache = null;
  }
}
