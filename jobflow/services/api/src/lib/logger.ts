/**
 * Strukturierte Logausgabe auf stdout.
 *
 * Keine Abhängigkeit nötig: eine Zeile JSON pro Ereignis lässt sich von
 * jedem Log-System einlesen. Personenbezogene Inhalte gehören nicht ins Log -
 * IDs ja, Beschreibungen und E-Mail-Adressen nein.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(minLevel: LogLevel = "info"): Logger {
  const threshold = LEVEL_ORDER[minLevel];

  function write(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < threshold) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      message,
      ...fields,
    });
    if (level === "error" || level === "warn") console.error(line);
    else console.log(line);
  }

  return {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  };
}

/** Verwirft jede Ausgabe - für Tests. */
export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
