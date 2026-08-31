import type { AnalyticsEvent } from "@jobflow/types";
import type { Queryable } from "../../db/pool.js";

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipPrefix?: string | null;
  detail?: Record<string, unknown>;
}

/**
 * Protokolliert eine sicherheitsrelevante Aktion.
 *
 * Bewusst mit demselben Client wie die eigentliche Änderung: entweder beides
 * oder nichts. Ein Protokoll, das den Vorgang nicht mitbekommt, ist wertlos.
 */
export async function recordAudit(client: Queryable, entry: AuditEntry): Promise<void> {
  await client.query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, ip_prefix, detail)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.actorId,
      entry.action,
      entry.entityType ?? null,
      entry.entityId ?? null,
      entry.ipPrefix ?? null,
      JSON.stringify(entry.detail ?? {}),
    ],
  );
}

export interface EventEntry {
  name: AnalyticsEvent;
  userId?: string | null;
  requestId?: string | null;
  businessId?: string | null;
  properties?: Record<string, unknown>;
}

/**
 * Schreibt ein Produktereignis für den Funnel.
 *
 * Wir messen den Weg von der Anfrage zum Auftrag - nicht Downloads. Deshalb
 * enthalten die Eigenschaften nur Kennzahlen und IDs, keine Freitexte der Nutzer.
 */
export async function recordEvent(client: Queryable, entry: EventEntry): Promise<void> {
  await client.query(
    `INSERT INTO analytics_events (name, user_id, request_id, business_id, properties)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.name,
      entry.userId ?? null,
      entry.requestId ?? null,
      entry.businessId ?? null,
      JSON.stringify(entry.properties ?? {}),
    ],
  );
}
