/**
 * Ein sehr kleines Validierungs-Werkzeug ohne Abhaengigkeiten.
 *
 * Bewusst klein gehalten: es laeuft unveraendert im Backend (Node) und in der
 * React-Native-App. Beide Seiten pruefen dieselben Regeln - die App fuer schnelle
 * Rueckmeldung, das Backend als verbindliche Instanz. Die App darf nie allein
 * darueber entscheiden, ob Daten gueltig sind.
 */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; fields: Record<string, string> };

/** Ein Validator prueft einen Wert an einer bestimmten Stelle (path). */
export interface Validator<T> {
  parse(input: unknown, path: string, errors: Record<string, string>): T | undefined;
}

/** Fuehrt einen Validator aus und liefert entweder Wert oder Feldfehler. */
export function validate<T>(validator: Validator<T>, input: unknown): ValidationResult<T> {
  const errors: Record<string, string> = {};
  const value = validator.parse(input, "", errors);
  if (Object.keys(errors).length > 0) return { ok: false, fields: errors };
  return { ok: true, value: value as T };
}

function fail(errors: Record<string, string>, path: string, message: string): undefined {
  // Der erste Fehler pro Feld ist der aussagekraeftigste; spaetere ueberschreiben ihn nicht.
  if (!(path in errors)) errors[path] = message;
  return undefined;
}

function join(path: string, key: string): string {
  return path === "" ? key : `${path}.${key}`;
}

// --- Bausteine -------------------------------------------------------------

export interface StringOptions {
  min?: number;
  max?: number;
  /** Fuehrende und abschliessende Leerzeichen entfernen (Standard: true). */
  trim?: boolean;
  pattern?: RegExp;
  patternMessage?: string;
}

export function string(options: StringOptions = {}): Validator<string> {
  const { min = 1, max = 10_000, trim = true, pattern, patternMessage } = options;
  return {
    parse(input, path, errors) {
      if (typeof input !== "string") return fail(errors, path, "Bitte einen Text angeben.");
      const value = trim ? input.trim() : input;
      if (value.length < min) {
        return fail(
          errors,
          path,
          min === 1 ? "Dieses Feld darf nicht leer sein." : `Bitte mindestens ${min} Zeichen angeben.`,
        );
      }
      if (value.length > max) return fail(errors, path, `Bitte hoechstens ${max} Zeichen angeben.`);
      if (pattern && !pattern.test(value)) {
        return fail(errors, path, patternMessage ?? "Das Format ist ungueltig.");
      }
      return value;
    },
  };
}

// Absichtlich pragmatisch: eine vollstaendige RFC-Pruefung ist weder moeglich
// noch sinnvoll. Ob eine Adresse existiert, zeigt erst die Bestaetigungsmail.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function email(): Validator<string> {
  return {
    parse(input, path, errors) {
      if (typeof input !== "string") return fail(errors, path, "Bitte eine E-Mail-Adresse angeben.");
      const value = input.trim().toLowerCase();
      if (value.length === 0) return fail(errors, path, "Bitte eine E-Mail-Adresse angeben.");
      if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
        return fail(errors, path, "Diese E-Mail-Adresse sieht nicht gueltig aus.");
      }
      return value;
    },
  };
}

export interface NumberOptions {
  min?: number;
  max?: number;
  int?: boolean;
}

export function number(options: NumberOptions = {}): Validator<number> {
  const { min, max, int = false } = options;
  return {
    parse(input, path, errors) {
      const value = typeof input === "string" && input.trim() !== "" ? Number(input) : input;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return fail(errors, path, "Bitte eine Zahl angeben.");
      }
      if (int && !Number.isInteger(value)) return fail(errors, path, "Bitte eine ganze Zahl angeben.");
      if (min !== undefined && value < min) return fail(errors, path, `Der Wert muss mindestens ${min} sein.`);
      if (max !== undefined && value > max) return fail(errors, path, `Der Wert darf hoechstens ${max} sein.`);
      return value;
    },
  };
}

export function boolean(): Validator<boolean> {
  return {
    parse(input, path, errors) {
      if (typeof input !== "boolean") return fail(errors, path, "Bitte ja oder nein angeben.");
      return input;
    },
  };
}

export function oneOf<const T extends readonly string[]>(values: T): Validator<T[number]> {
  return {
    parse(input, path, errors) {
      if (typeof input !== "string" || !values.includes(input)) {
        return fail(errors, path, `Erlaubt sind: ${values.join(", ")}.`);
      }
      return input as T[number];
    },
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uuid(): Validator<string> {
  return {
    parse(input, path, errors) {
      if (typeof input !== "string" || !UUID_PATTERN.test(input)) {
        return fail(errors, path, "Ungueltige Kennung.");
      }
      return input.toLowerCase();
    },
  };
}

/** ISO-8601-Zeitstempel. Liefert den normalisierten UTC-String zurueck. */
export function isoDateTime(): Validator<string> {
  return {
    parse(input, path, errors) {
      if (typeof input !== "string") return fail(errors, path, "Bitte einen Zeitpunkt angeben.");
      const ms = Date.parse(input);
      if (Number.isNaN(ms)) return fail(errors, path, "Dieser Zeitpunkt ist ungueltig.");
      return new Date(ms).toISOString();
    },
  };
}

export function latitude(): Validator<number> {
  return number({ min: -90, max: 90 });
}

export function longitude(): Validator<number> {
  return number({ min: -180, max: 180 });
}

/** Erlaubt zusaetzlich undefined und einen fehlenden Schluessel. */
export function optional<T>(inner: Validator<T>): Validator<T | undefined> {
  return {
    parse(input, path, errors) {
      if (input === undefined) return undefined;
      return inner.parse(input, path, errors);
    },
  };
}

/** Erlaubt zusaetzlich null (und undefined, das zu null wird). */
export function nullable<T>(inner: Validator<T>): Validator<T | null> {
  return {
    parse(input, path, errors) {
      if (input === null || input === undefined) return null;
      const value = inner.parse(input, path, errors);
      return value === undefined ? undefined : value;
    },
  };
}

/** Setzt einen Standardwert ein, wenn nichts uebergeben wurde. */
export function withDefault<T>(inner: Validator<T>, fallback: T): Validator<T> {
  return {
    parse(input, path, errors) {
      if (input === undefined || input === null) return fallback;
      return inner.parse(input, path, errors);
    },
  };
}

export function array<T>(inner: Validator<T>, options: { min?: number; max?: number } = {}): Validator<T[]> {
  const { min = 0, max = 100 } = options;
  return {
    parse(input, path, errors) {
      if (!Array.isArray(input)) return fail(errors, path, "Bitte eine Liste angeben.");
      if (input.length < min) return fail(errors, path, `Bitte mindestens ${min} Eintraege angeben.`);
      if (input.length > max) return fail(errors, path, `Bitte hoechstens ${max} Eintraege angeben.`);
      const out: T[] = [];
      let failed = false;
      input.forEach((item, index) => {
        const before = Object.keys(errors).length;
        const value = inner.parse(item, join(path, String(index)), errors);
        if (Object.keys(errors).length > before) failed = true;
        else out.push(value as T);
      });
      return failed ? undefined : out;
    },
  };
}

type ShapeOf<S extends Record<string, Validator<unknown>>> = {
  [K in keyof S]: S[K] extends Validator<infer T> ? T : never;
};

/**
 * Objekt-Validator. Unbekannte Schluessel werden verworfen - so kann ein Client
 * keine Felder unterschieben, die es gar nicht geben soll.
 */
export function object<S extends Record<string, Validator<any>>>(shape: S): Validator<ShapeOf<S>> {
  return {
    parse(input, path, errors) {
      if (typeof input !== "object" || input === null || Array.isArray(input)) {
        return fail(errors, path, "Es wurden keine gueltigen Daten uebermittelt.");
      }
      const source = input as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      let failed = false;
      for (const key of Object.keys(shape)) {
        const validator = shape[key] as Validator<unknown>;
        // Ob ein Feld in Ordnung ist, entscheidet allein, ob der Validator einen
        // Fehler gemeldet hat. Ein undefined als Rueckgabe ist bei optional()
        // ein voellig legitimes Ergebnis.
        const before = Object.keys(errors).length;
        const value = validator.parse(source[key], join(path, key), errors);
        if (Object.keys(errors).length > before) {
          failed = true;
          continue;
        }
        if (value !== undefined) out[key] = value;
      }
      return failed ? undefined : (out as ShapeOf<S>);
    },
  };
}

/** Prueft einen bereits geparsten Wert und wirft nicht - nur zur Verfeinerung. */
export function refine<T>(inner: Validator<T>, check: (value: T) => string | null): Validator<T> {
  return {
    parse(input, path, errors) {
      const value = inner.parse(input, path, errors);
      if (value === undefined) return undefined;
      const message = check(value);
      if (message !== null) return fail(errors, path, message);
      return value;
    },
  };
}
