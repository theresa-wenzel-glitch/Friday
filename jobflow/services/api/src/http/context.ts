import type { IncomingMessage, ServerResponse } from "node:http";
import type { User, UserRole } from "@jobflow/types";
import type { Validator } from "@jobflow/validation";
import { validate } from "@jobflow/validation";
import { readJsonBody } from "./body.js";
import { ApiError } from "./errors.js";
import type { AppServices } from "../services.js";

/** Der angemeldete Nutzer samt Session, die ihn ausgewiesen hat. */
export interface Principal {
  user: User;
  sessionId: string;
}

/**
 * Alles, was ein Handler über die laufende Anfrage wissen muss.
 *
 * Die Berechtigungsprüfung laeuft ausschließlich hier und in den Services -
 * niemals im Client. Ein Handler, der `ctx.requireUser()` nicht aufruft, ist
 * öffentlich, und das soll man ihm ansehen.
 */
export class RequestContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly params: Record<string, string>;
  readonly query: URLSearchParams;
  readonly app: AppServices;
  /** Auf /24 bzw. /48 gekürzte Client-Adresse - für Rate Limiting und Protokoll. */
  readonly ipPrefix: string;

  private cachedBody: unknown;
  private bodyRead = false;
  private principal: Principal | null = null;
  private principalResolved = false;

  constructor(init: {
    req: IncomingMessage;
    res: ServerResponse;
    params: Record<string, string>;
    query: URLSearchParams;
    app: AppServices;
    ipPrefix: string;
  }) {
    this.req = init.req;
    this.res = init.res;
    this.params = init.params;
    this.query = init.query;
    this.app = init.app;
    this.ipPrefix = init.ipPrefix;
  }

  /** Pfadparameter, der vorhanden sein muss. */
  param(name: string): string {
    const value = this.params[name];
    if (value === undefined) throw ApiError.notFound();
    return value;
  }

  async body(): Promise<unknown> {
    if (!this.bodyRead) {
      this.cachedBody = await readJsonBody(this.req);
      this.bodyRead = true;
    }
    return this.cachedBody;
  }

  /** Liest den Rumpf und prüft ihn gegen ein Schema. */
  async input<T>(schema: Validator<T>): Promise<T> {
    const result = validate(schema, await this.body());
    if (!result.ok) throw ApiError.validation(result.fields);
    return result.value;
  }

  /** Prüft die Query-Parameter gegen ein Schema. */
  queryInput<T>(schema: Validator<T>): T {
    const raw: Record<string, string> = {};
    for (const [key, value] of this.query.entries()) raw[key] = value;
    const result = validate(schema, raw);
    if (!result.ok) throw ApiError.validation(result.fields);
    return result.value;
  }

  /** Angemeldeter Nutzer oder null. Für Endpunkte, die beides erlauben. */
  async currentUser(): Promise<Principal | null> {
    if (!this.principalResolved) {
      this.principal = await this.app.authenticate(this.req);
      this.principalResolved = true;
    }
    return this.principal;
  }

  /** Angemeldeter Nutzer - wirft, wenn kein gültiges Token vorliegt. */
  async requireUser(): Promise<Principal> {
    const principal = await this.currentUser();
    if (principal === null) throw ApiError.unauthenticated();
    return principal;
  }

  /** Angemeldeter Nutzer mit einer der genannten Rollen. */
  async requireRole(...roles: UserRole[]): Promise<Principal> {
    const principal = await this.requireUser();
    if (!roles.includes(principal.user.role)) {
      throw ApiError.forbidden("Diese Aktion ist für deine Rolle nicht vorgesehen.");
    }
    return principal;
  }
}
