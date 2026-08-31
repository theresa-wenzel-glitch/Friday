import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * CORS nur für ausdrücklich erlaubte Origins.
 *
 * Kein "*": die API antwortet mit nutzerbezogenen Daten und muss wissen,
 * welche Web-Oberflächen sie ansprechen dürfen. Die Mobile-App ist von CORS
 * ohnehin nicht betroffen.
 */
export function applyCors(req: IncomingMessage, res: ServerResponse, allowed: string[]): void {
  const origin = req.headers.origin;
  if (typeof origin !== "string" || !allowed.includes(origin)) return;

  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-credentials", "true");
  res.setHeader("access-control-allow-headers", "content-type, authorization");
  res.setHeader("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("access-control-max-age", "600");
  // Antworten unterscheiden sich je Origin - sonst liefert ein Cache die
  // falschen Header aus.
  res.setHeader("vary", "origin");
}
