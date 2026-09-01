import type {
  Entitlements,
  PlanCode,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  UsageSummary,
} from "@jobflow/types";
import type { Db, Queryable } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import { recordAudit } from "../analytics/audit.js";
import { PlanCatalog } from "./plans.js";

interface SubscriptionRow {
  id: string;
  business_id: string;
  plan_code: PlanCode;
  status: SubscriptionStatus;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  period_start: Date;
  period_end: Date;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    businessId: row.business_id,
    planCode: row.plan_code,
    status: row.status,
    provider: row.provider,
    periodStart: row.period_start.toISOString(),
    periodEnd: row.period_end.toISOString(),
    cancelAtPeriodEnd: row.cancel_at_period_end,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Erster Tag des laufenden Monats - der Abrechnungszeitraum des Verbrauchs. */
export function periodStart(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export class BillingService {
  private readonly plans: PlanCatalog;

  constructor(private readonly db: Db) {
    this.plans = new PlanCatalog(db);
  }

  listPlans(): Promise<SubscriptionPlan[]> {
    return this.plans.list();
  }

  /** Das aktive Abo eines Betriebs, oder null. */
  async activeSubscription(businessId: string, client: Queryable = this.db): Promise<Subscription | null> {
    const result = await client.query<SubscriptionRow>(
      `SELECT * FROM subscriptions
       WHERE business_id = $1 AND status IN ('ACTIVE', 'PAST_DUE')
       ORDER BY created_at DESC LIMIT 1`,
      [businessId],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapSubscription(row);
  }

  /**
   * Was ein Betrieb gerade darf.
   *
   * Diese Funktion ist die einzige Stelle, an der über Guthaben entschieden
   * wird. Alles andere fragt sie - sonst driften Oberfläche und Backend
   * auseinander, und am Ende erlaubt die App etwas, das der Server verbietet.
   */
  async entitlements(businessId: string, client: Queryable = this.db): Promise<Entitlements> {
    const subscription = await this.activeSubscription(businessId, client);

    // Ein überfälliges Abo behält vorerst seine Funktionen. Erst wenn der
    // Anbieter endgültig storniert, fällt der Betrieb auf Free zurück -
    // eine fehlgeschlagene Abbuchung ist noch keine Kündigung.
    const plan = subscription === null
      ? await this.plans.fallback()
      : (await this.plans.byCode(subscription.planCode)) ?? (await this.plans.fallback());

    const usage = await this.usage(businessId, plan, client);

    return {
      plan,
      subscription,
      usage,
      canSendOffer: usage.offersLeft === null || usage.offersLeft > 0,
      canUseAiAssistant: plan.aiAssistant,
    };
  }

  async usage(businessId: string, plan: SubscriptionPlan, client: Queryable = this.db): Promise<UsageSummary> {
    const start = periodStart();
    const result = await client.query<{ offers_sent: number; ai_calls: number }>(
      "SELECT offers_sent, ai_calls FROM usage_periods WHERE business_id = $1 AND period_start = $2",
      [businessId, start],
    );
    const row = result.rows[0] ?? { offers_sent: 0, ai_calls: 0 };
    const imErstenMonat = await this.isFirstMonth(businessId, client);

    // Im ersten Kalendermonat gilt das höhere Guthaben, sofern das Paket eines
    // vorsieht. Danach das reguläre - ohne dass jemand etwas umstellen muss.
    const limit = imErstenMonat && plan.firstMonthOfferLimit !== null
      ? plan.firstMonthOfferLimit
      : plan.monthlyOfferLimit;

    return {
      periodStart: new Date(`${start}T00:00:00.000Z`).toISOString(),
      offersSent: row.offers_sent,
      offerLimit: limit,
      offersLeft: limit === null ? null : Math.max(0, limit - row.offers_sent),
      welcomeAllowance: imErstenMonat && plan.firstMonthOfferLimit !== null,
      aiCalls: row.ai_calls,
    };
  }

  /**
   * Ist der Betrieb noch im Kalendermonat seiner Anmeldung?
   *
   * Bewusst der Kalendermonat und nicht "30 Tage ab Anmeldung": der
   * Verbrauchszähler läuft ohnehin je Kalendermonat, und zwei verschiedene
   * Zeitrechnungen im selben Guthaben wären eine sichere Fehlerquelle.
   */
  private async isFirstMonth(businessId: string, client: Queryable): Promise<boolean> {
    const result = await client.query<{ erster_monat: boolean }>(
      `SELECT date_trunc('month', created_at) = date_trunc('month', now()) AS erster_monat
       FROM businesses WHERE id = $1`,
      [businessId],
    );
    return result.rows[0]?.erster_monat === true;
  }

  /**
   * Prüft das Guthaben und zählt einen Verbrauch hoch - in einem Schritt.
   *
   * Prüfen und Zählen müssen zusammen geschehen und mit demselben Client wie
   * die eigentliche Aktion laufen: sonst könnten zwei gleichzeitige Angebote
   * beide die letzte freie Stelle sehen. `ON CONFLICT` macht das Anlegen der
   * Zeile nebenläufigkeitssicher.
   */
  async consumeOffer(client: Queryable, businessId: string): Promise<void> {
    const entitlements = await this.entitlements(businessId, client);
    if (!entitlements.canSendOffer) {
      throw new ApiError(
        402,
        "PLAN_LIMIT_REACHED",
        `Im Paket ${entitlements.plan.name} sind ${String(entitlements.usage.offerLimit)} Angebote je Monat enthalten. ` +
          "Für mehr Anfragen wechsle auf ein größeres Paket.",
      );
    }
    await client.query(
      `INSERT INTO usage_periods (business_id, period_start, offers_sent)
       VALUES ($1, $2, 1)
       ON CONFLICT (business_id, period_start)
       DO UPDATE SET offers_sent = usage_periods.offers_sent + 1`,
      [businessId, periodStart()],
    );
  }

  async consumeAiCall(client: Queryable, businessId: string): Promise<void> {
    const entitlements = await this.entitlements(businessId, client);
    if (!entitlements.canUseAiAssistant) {
      throw new ApiError(
        402,
        "PLAN_LIMIT_REACHED",
        "Die KI-Textvorschläge gehören zu Pro. Über Preis und Inhalt eines Angebots entscheidest du weiterhin selbst.",
      );
    }
    await client.query(
      `INSERT INTO usage_periods (business_id, period_start, ai_calls)
       VALUES ($1, $2, 1)
       ON CONFLICT (business_id, period_start)
       DO UPDATE SET ai_calls = usage_periods.ai_calls + 1`,
      [businessId, periodStart()],
    );
  }

  /**
   * Setzt das Paket eines Betriebs.
   *
   * Wird vom Webhook des Zahlungsanbieters aufgerufen, sobald eine Zahlung
   * bestätigt ist - und beim Wechsel auf Free, der keine Zahlung braucht.
   */
  async setPlan(
    businessId: string,
    planCode: PlanCode,
    options: {
      status?: SubscriptionStatus;
      provider?: string | null;
      providerCustomerId?: string | null;
      providerSubscriptionId?: string | null;
      periodEnd?: Date | null;
      actorId?: string | null;
    } = {},
  ): Promise<Subscription> {
    const plan = await this.plans.byCode(planCode);
    if (plan === null) throw ApiError.validation({ planCode: "Dieses Paket gibt es nicht." });

    return withTransaction(this.db, async (client) => {
      // Ein Betrieb hat höchstens ein aktives Abo; das alte wird beendet,
      // bevor das neue entsteht. Der Teilindex in der Datenbank sichert das ab.
      await client.query(
        "UPDATE subscriptions SET status = 'CANCELLED' WHERE business_id = $1 AND status IN ('ACTIVE', 'PAST_DUE')",
        [businessId],
      );

      const ende = options.periodEnd ?? null;
      const inserted = await client.query<SubscriptionRow>(
        `INSERT INTO subscriptions
           (business_id, plan_code, status, provider, provider_customer_id, provider_subscription_id,
            period_start, period_end)
         VALUES ($1, $2, $3, $4, $5, $6, date_trunc('month', now()),
                 COALESCE($7::timestamptz, date_trunc('month', now()) + interval '1 month'))
         RETURNING *`,
        [
          businessId,
          planCode,
          options.status ?? "ACTIVE",
          options.provider ?? null,
          options.providerCustomerId ?? null,
          options.providerSubscriptionId ?? null,
          ende === null ? null : ende.toISOString(),
        ],
      );

      await recordAudit(client, {
        actorId: options.actorId ?? null,
        action: "subscription.changed",
        entityType: "business",
        entityId: businessId,
        detail: { planCode, provider: options.provider ?? null },
      });

      return mapSubscription(inserted.rows[0] as SubscriptionRow);
    });
  }

  /** Kündigt zum Ende des laufenden Zeitraums - nicht sofort. */
  async cancelAtPeriodEnd(businessId: string): Promise<Subscription> {
    const result = await this.db.query<SubscriptionRow>(
      `UPDATE subscriptions SET cancel_at_period_end = true
       WHERE business_id = $1 AND status IN ('ACTIVE', 'PAST_DUE')
       RETURNING *`,
      [businessId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Zu diesem Betrieb gibt es kein laufendes Abo.");
    return mapSubscription(row);
  }

  /** Findet das Abo zu einer Anbieter-Kennung - für den Webhook. */
  async byProviderSubscriptionId(externalId: string): Promise<Subscription | null> {
    const result = await this.db.query<SubscriptionRow>(
      "SELECT * FROM subscriptions WHERE provider_subscription_id = $1 ORDER BY created_at DESC LIMIT 1",
      [externalId],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapSubscription(row);
  }

  async setStatus(subscriptionId: string, status: SubscriptionStatus): Promise<void> {
    await this.db.query("UPDATE subscriptions SET status = $2 WHERE id = $1", [subscriptionId, status]);
  }
}
