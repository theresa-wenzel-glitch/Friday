import type { IncomingMessage, ServerResponse } from "node:http";
import type { RequestContext } from "./context.js";
import { ApiError } from "./errors.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type Handler = (ctx: RequestContext) => Promise<unknown>;

interface Route {
  method: HttpMethod;
  /** Segmente des Pfads; ":name" steht fuer einen Parameter. */
  segments: string[];
  handler: Handler;
}

/**
 * Ein sehr kleiner Router.
 *
 * Bewusst ohne Framework: JobFlow braucht Pfadparameter und sonst nichts.
 * Ein eigener Router in fuenfzig Zeilen ist leichter zu pruefen als eine
 * Abhaengigkeit, die zehnmal so viel kann.
 */
export class Router {
  private readonly routes: Route[] = [];

  add(method: HttpMethod, pattern: string, handler: Handler): this {
    this.routes.push({ method, segments: splitPath(pattern), handler });
    return this;
  }

  get(pattern: string, handler: Handler): this {
    return this.add("GET", pattern, handler);
  }
  post(pattern: string, handler: Handler): this {
    return this.add("POST", pattern, handler);
  }
  patch(pattern: string, handler: Handler): this {
    return this.add("PATCH", pattern, handler);
  }
  delete(pattern: string, handler: Handler): this {
    return this.add("DELETE", pattern, handler);
  }

  /** Haengt die Routen eines Moduls unter einem Praefix ein. */
  mount(prefix: string, other: Router): this {
    const prefixSegments = splitPath(prefix);
    for (const route of other.routes) {
      this.routes.push({ ...route, segments: [...prefixSegments, ...route.segments] });
    }
    return this;
  }

  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null {
    const segments = splitPath(pathname);
    let pathExists = false;

    for (const route of this.routes) {
      const params = matchSegments(route.segments, segments);
      if (params === null) continue;
      pathExists = true;
      if (route.method === method) return { handler: route.handler, params };
    }

    // Der Pfad gibt es, nur nicht mit dieser Methode - das ist eine andere
    // Aussage als "gibt es nicht" und hilft beim Debuggen der Clients.
    if (pathExists) {
      throw new ApiError(405, "NOT_FOUND", `Die Methode ${method} ist fuer diesen Pfad nicht erlaubt.`);
    }
    return null;
  }
}

function splitPath(pathname: string): string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

function matchSegments(pattern: string[], actual: string[]): Record<string, string> | null {
  if (pattern.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i += 1) {
    const expected = pattern[i] as string;
    const value = actual[i] as string;
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(value);
    } else if (expected !== value) {
      return null;
    }
  }
  return params;
}

export type { IncomingMessage, ServerResponse };
