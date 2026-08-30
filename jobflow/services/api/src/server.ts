import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { applyCors } from "./http/cors.js";
import { RequestContext } from "./http/context.js";
import { ApiError } from "./http/errors.js";
import { failure, sendJson, success } from "./http/response.js";
import { clientIpPrefix } from "./lib/net.js";
import { buildRouter } from "./routes.js";
import type { AppServices } from "./services.js";

export function createApiServer(app: AppServices): Server {
  const router = buildRouter();

  return createServer((req, res) => {
    const startedAt = process.hrtime.bigint();
    const url = new URL(req.url ?? "/", "http://localhost");

    applyCors(req, res, app.config.corsOrigins);

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    void handle(app, router, req, res, url)
      .catch((error: unknown) => {
        // Der letzte Rettungsanker: hierher kommt nur, was handle() selbst
        // nicht mehr beantworten konnte.
        app.logger.error("Antwort konnte nicht gesendet werden", { error: String(error) });
        if (!res.headersSent) {
          sendJson(res, 500, failure("INTERNAL_ERROR", "Unerwarteter Fehler."));
        }
      })
      .finally(() => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        // Der Pfad wird ohne Query protokolliert - dort koennen Suchbegriffe
        // und andere persoenliche Angaben stehen.
        app.logger.info("request", {
          method: req.method,
          path: url.pathname,
          status: res.statusCode,
          durationMs: Math.round(durationMs),
        });
      });
  });
}

async function handle(
  app: AppServices,
  router: ReturnType<typeof buildRouter>,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  try {
    const match = router.match(req.method ?? "GET", url.pathname);
    if (match === null) {
      sendJson(res, 404, failure("NOT_FOUND", "Diesen Endpunkt gibt es nicht."));
      return;
    }

    const ctx = new RequestContext({
      req,
      res,
      params: match.params,
      query: url.searchParams,
      app,
      ipPrefix: clientIpPrefix(req),
    });

    const data = await match.handler(ctx);
    // Ein Handler, der selbst geantwortet hat (etwa ein Datei-Download),
    // liefert undefined zurueck.
    if (res.writableEnded) return;
    sendJson(res, statusFor(req.method ?? "GET", data), success(data ?? null));
  } catch (error) {
    if (error instanceof ApiError) {
      sendJson(res, error.status, failure(error.code, error.message, error.fields));
      return;
    }

    // Alles andere ist ein Fehler auf unserer Seite. Details gehoeren ins Log,
    // nicht in die Antwort - sonst verraet eine Fehlermeldung die Struktur der
    // Datenbank.
    app.logger.error("unbehandelter Fehler", {
      path: url.pathname,
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    sendJson(res, 500, failure("INTERNAL_ERROR", "Unerwarteter Fehler."));
  }
}

function statusFor(method: string, data: unknown): number {
  if (method === "POST" && data !== null && data !== undefined) return 201;
  return 200;
}
