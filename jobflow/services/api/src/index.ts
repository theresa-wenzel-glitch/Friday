/**
 * Einstiegspunkt der API.
 */
import { loadConfig } from "./config.js";
import { createApiServer } from "./server.js";
import { buildServices } from "./services.js";

function main(): void {
  const config = loadConfig();
  const app = buildServices({ config });
  const server = createApiServer(app);

  server.listen(config.port, () => {
    app.logger.info("JobFlow-API gestartet", {
      port: config.port,
      aiProvider: config.ai.provider,
      environment: config.isProduction ? "production" : "development",
    });
  });

  // Laufende Anfragen zu Ende bringen, statt sie mitten im Schreiben
  // abzuschneiden.
  const shutdown = (signal: string): void => {
    app.logger.info("Herunterfahren", { signal });
    server.close(() => {
      void app.shutdown().then(() => process.exit(0));
    });
    // Falls eine Verbindung haengt, nicht ewig warten.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

try {
  main();
} catch (error) {
  console.error(`Start fehlgeschlagen: ${(error as Error).message}`);
  process.exit(1);
}
