import pg from "pg";

const { Pool, types } = pg;

export type Db = pg.Pool;
export type DbClient = pg.PoolClient;
/** Pool und Client teilen sich query() - Services nehmen beides entgegen. */
export type Queryable = Pick<pg.Pool, "query">;

// numeric kommt sonst als String zurueck. JobFlow verwendet numeric nur fuer
// Bewertungen und Konfidenzwerte - beides sind echte Zahlen.
const NUMERIC_OID = 1700;
types.setTypeParser(NUMERIC_OID, (value) => Number(value));

// int8 (bigint) bleibt bewusst ein String: die Werte koennten Number.MAX_SAFE_INTEGER
// ueberschreiten. Betroffen sind nur die fortlaufenden IDs der Ereignistabellen.

export function createPool(connectionString: string): Db {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

/**
 * Fuehrt eine Funktion in einer Transaktion aus.
 *
 * Alles, was mehrere Tabellen zugleich veraendert - ein Angebot annehmen legt
 * einen Auftrag an, aktualisiert die Anfrage und lehnt die uebrigen Angebote ab -
 * gehoert hier hinein. Halb ausgefuehrte Zustandswechsel waeren in einem
 * Marktplatz besonders unangenehm.
 */
export async function withTransaction<T>(db: Db, fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Die Verbindung ist bereits kaputt - der urspruengliche Fehler zaehlt.
    }
    throw error;
  } finally {
    client.release();
  }
}
