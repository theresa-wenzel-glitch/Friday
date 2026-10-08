/**
 * Zustände der Formulare. Bewusst nicht in der "use server"-Datei, siehe
 * src/lib/form-state.ts.
 */

export interface FormZustand {
  fehler?: string;
  ok?: string;
  werte?: Record<string, string>;
}

export const LEER: FormZustand = {};
