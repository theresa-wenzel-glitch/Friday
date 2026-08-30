import type { IncomingMessage } from "node:http";
import type { AuthResult, User, UserRole } from "@jobflow/types";
import type { Queryable, Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";
import type { Principal } from "../../http/context.js";
import { hashPassword, verifyPassword } from "./password.js";
import { bearerToken, createToken, hashToken } from "./tokens.js";
import { mapUser, type UserRow } from "../users/mapper.js";
import { recordAudit } from "../analytics/audit.js";

export interface AuthServiceOptions {
  db: Db;
  sessionSecret: string;
  sessionTtlSeconds: number;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
  role: "CUSTOMER" | "BUSINESS";
  phone?: string | null;
}

export class AuthService {
  private readonly db: Db;
  private readonly sessionSecret: string;
  private readonly sessionTtlSeconds: number;

  constructor(options: AuthServiceOptions) {
    this.db = options.db;
    this.sessionSecret = options.sessionSecret;
    this.sessionTtlSeconds = options.sessionTtlSeconds;
  }

  async register(input: RegisterInput, ipPrefix: string): Promise<AuthResult> {
    const passwordHash = await hashPassword(input.password);

    return withTransaction(this.db, async (client) => {
      const inserted = await client.query<UserRow>(
        `INSERT INTO users (email, name, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING
         RETURNING *`,
        [input.email, input.name, passwordHash, input.role, input.phone ?? null],
      );

      const row = inserted.rows[0];
      if (row === undefined) {
        // Die Adresse ist bereits vergeben. Das laesst sich bei einer
        // Registrierung nicht verbergen - der Nutzer muss ja erfahren, dass er
        // sich stattdessen anmelden soll.
        throw ApiError.conflict("Zu dieser E-Mail-Adresse gibt es bereits ein Konto.");
      }

      // Ein Unternehmenskonto bekommt sofort ein - noch leeres - Profil.
      // Sonst muesste jede spaetere Abfrage den Sonderfall "Konto ohne
      // Unternehmen" behandeln.
      if (row.role === "BUSINESS") {
        const business = await client.query<{ id: string }>(
          `INSERT INTO businesses (owner_id, name) VALUES ($1, $2) RETURNING id`,
          [row.id, input.name],
        );
        await client.query(
          `INSERT INTO business_members (business_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
          [business.rows[0]?.id, row.id],
        );
      }

      const session = await this.issueSession(client, row.id);
      await recordAudit(client, {
        actorId: row.id,
        action: "user.registered",
        entityType: "user",
        entityId: row.id,
        ipPrefix,
        detail: { role: row.role },
      });

      return { user: mapUser(row), token: session.token, expiresAt: session.expiresAt };
    });
  }

  async login(email: string, password: string, ipPrefix: string): Promise<AuthResult> {
    const found = await this.db.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
    const row = found.rows[0];

    // Auch wenn es das Konto nicht gibt, wird ein Hash geprueft. Sonst waere an
    // der Antwortzeit ablesbar, welche Adressen registriert sind.
    const storedHash = row?.password_hash ?? DUMMY_PASSWORD_HASH;
    const passwordOk = await verifyPassword(password, storedHash);

    if (row === undefined || !passwordOk) {
      throw new ApiError(401, "UNAUTHENTICATED", "E-Mail-Adresse oder Passwort ist falsch.");
    }
    if (row.blocked_at !== null) {
      throw ApiError.forbidden("Dieses Konto ist gesperrt. Bitte wende dich an den Support.");
    }

    return withTransaction(this.db, async (client) => {
      const session = await this.issueSession(client, row.id);
      await recordAudit(client, {
        actorId: row.id,
        action: "user.logged_in",
        entityType: "user",
        entityId: row.id,
        ipPrefix,
      });
      return { user: mapUser(row), token: session.token, expiresAt: session.expiresAt };
    });
  }

  async logout(sessionId: string): Promise<void> {
    await this.db.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
  }

  /** Meldet den Nutzer auf allen Geraeten ab. */
  async logoutEverywhere(userId: string): Promise<void> {
    await this.db.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  }

  /**
   * Loest das Bearer-Token in einen Nutzer auf.
   *
   * Liefert null statt zu werfen: manche Endpunkte duerfen mit und ohne
   * Anmeldung aufgerufen werden.
   */
  async authenticate(req: IncomingMessage): Promise<Principal | null> {
    const token = bearerToken(req.headers.authorization);
    if (token === null) return null;

    const tokenHash = hashToken(token, this.sessionSecret);
    const result = await this.db.query<UserRow & { session_id: string }>(
      `SELECT u.*, s.id AS session_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash],
    );

    const row = result.rows[0];
    if (row === undefined) return null;
    // Eine Sperrung wirkt sofort, auch auf bereits ausgestellte Tokens.
    if (row.blocked_at !== null) return null;

    // Nur grob fortschreiben - ein Schreibzugriff pro Anfrage waere Verschwendung.
    void this.db
      .query("UPDATE sessions SET last_seen_at = now() WHERE id = $1 AND last_seen_at < now() - interval '5 minutes'", [
        row.session_id,
      ])
      .catch(() => {});

    return { user: mapUser(row), sessionId: row.session_id };
  }

  private async issueSession(
    client: Queryable,
    userId: string,
  ): Promise<{ token: string; expiresAt: string }> {
    const token = createToken();
    const tokenHash = hashToken(token, this.sessionSecret);
    const result = await client.query<{ expires_at: Date }>(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(secs => $3))
       RETURNING expires_at`,
      [userId, tokenHash, this.sessionTtlSeconds],
    );
    return { token, expiresAt: (result.rows[0] as { expires_at: Date }).expires_at.toISOString() };
  }
}

/**
 * Ein gueltig aufgebauter, aber unerreichbarer Hash. Er dient nur dazu, dass
 * die Anmeldung bei unbekannten Adressen dieselbe Arbeit leistet wie bei
 * bekannten.
 */
const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export type { UserRole, User };
