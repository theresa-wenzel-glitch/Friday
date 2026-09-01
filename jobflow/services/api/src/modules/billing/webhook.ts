import type { Db } from "../../db/pool.js";
import type { BillingService } from "./service.js";
import type { PaymentProvider, WebhookEvent } from "./provider.js";
import type { Logger } from "../../lib/logger.js";

/**
 * Verarbeitet ein geprüftes Webhook-Ereignis.
 *
 * Drei Eigenschaften sind wichtig:
 *
 *   1. Das Ereignis wird zuerst protokolliert, dann angewendet. Bei einem
 *      Streit über eine Zahlung ist das die einzige Spur.
 *   2. Ein zweites Mal dasselbe Ereignis ändert nichts. Zahlungsanbieter
 *      senden bei Zustellproblemen erneut - ohne diese Absicherung liefe ein
 *      Abo mehrfach an.
 *   3. Ein unbekanntes Ereignis wird abgelegt und ignoriert, nicht abgelehnt.
 *      Sonst wiederholt der Anbieter es endlos.
 */
export async function handleWebhookEvent(
  db: Db,
  billing: BillingService,
  provider: PaymentProvider,
  ereignis: WebhookEvent,
  logger: Logger,
): Promise<{ processed: boolean; duplicate: boolean }> {
  const eingefuegt = await db.query<{ id: string }>(
    `INSERT INTO payment_events (provider, external_id, type, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (provider, external_id) DO NOTHING
     RETURNING id`,
    [provider.name, ereignis.externalId, ereignis.type, JSON.stringify(ereignis.raw)],
  );

  if (eingefuegt.rows.length === 0) {
    logger.info("Zahlungsereignis bereits verarbeitet", { type: ereignis.type });
    return { processed: false, duplicate: true };
  }
  const eventId = (eingefuegt.rows[0] as { id: string }).id;

  const fertig = async (): Promise<void> => {
    await db.query("UPDATE payment_events SET processed_at = now() WHERE id = $1", [eventId]);
  };

  if (ereignis.effect === "IGNORE") {
    await fertig();
    return { processed: false, duplicate: false };
  }

  // Der Betrieb wird über die Metadaten gefunden, die beim Bezahlvorgang
  // mitgegeben wurden - oder über das bereits bekannte Abo.
  let businessId = ereignis.businessId;
  const bestehendes = ereignis.providerSubscriptionId === null
    ? null
    : await billing.byProviderSubscriptionId(ereignis.providerSubscriptionId);
  if (businessId === null && bestehendes !== null) businessId = bestehendes.businessId;

  if (businessId === null) {
    logger.warn("Zahlungsereignis ohne zuordenbaren Betrieb", { type: ereignis.type });
    await fertig();
    return { processed: false, duplicate: false };
  }

  switch (ereignis.effect) {
    case "ACTIVATE": {
      const planCode = ereignis.planCode ?? bestehendes?.planCode ?? null;
      if (planCode === null) {
        logger.warn("Zahlungsereignis ohne Paket", { type: ereignis.type, businessId });
        break;
      }
      await billing.setPlan(businessId, planCode, {
        status: "ACTIVE",
        provider: provider.name,
        providerCustomerId: ereignis.providerCustomerId,
        providerSubscriptionId: ereignis.providerSubscriptionId,
        periodEnd: ereignis.periodEnd,
      });
      logger.info("Abo aktiviert", { businessId, planCode });
      break;
    }
    case "PAST_DUE": {
      // Eine fehlgeschlagene Abbuchung ist noch keine Kündigung: der Betrieb
      // behält seine Funktionen, bis der Anbieter endgültig storniert.
      if (bestehendes !== null) await billing.setStatus(bestehendes.id, "PAST_DUE");
      logger.warn("Zahlung fehlgeschlagen", { businessId });
      break;
    }
    case "CANCEL": {
      if (bestehendes !== null) await billing.setStatus(bestehendes.id, "CANCELLED");
      logger.info("Abo beendet, Betrieb fällt auf Free zurück", { businessId });
      break;
    }
  }

  await fertig();
  return { processed: true, duplicate: false };
}
