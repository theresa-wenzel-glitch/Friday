/**
 * Abstammungen aus einer Textliste übernehmen.
 *
 * Gedacht für den Fall, dass jemand eine Abstammung vor sich hat - etwa auf
 * allbreedpedigree.com oder im Zuchtbuchpapier - und sie eintragen möchte,
 * ohne jedes Pferd einzeln über das Formular anzulegen.
 *
 * Erwartet wird je Zeile:
 *
 *     Pferd | Vater | Mutter
 *     Pferd | Vater | Mutter | Jahrgang | Farbe
 *
 * Als Trenner sind auch Tabulatoren und Semikolon erlaubt, damit sich Zeilen
 * aus einer Tabelle einfügen lassen. Ein Bindestrich oder ein leeres Feld
 * bedeutet "unbekannt" - dann wird nichts eingetragen statt geraten.
 */

import {
  findHorseByName,
  getDb,
  insertHorse,
  relinkAll,
  type HorseInput,
} from "./db";
import { normalizeName } from "./slug";
import type { Sex } from "./types";

export interface ImportRow {
  line: number;
  name: string;
  sireName: string | null;
  damName: string | null;
  yearOfBirth: number | null;
  color: string | null;
}

export interface ImportAction {
  name: string;
  /** angelegt | ergänzt (Abstammung nachgetragen) | unverändert */
  kind: "create" | "update" | "unchanged";
  sex: Sex;
  detail: string;
}

export interface ImportPlan {
  rows: ImportRow[];
  actions: ImportAction[];
  errors: string[];
  counts: { create: number; update: number; unchanged: number };
}

const UNKNOWN = new Set(["", "-", "--", "?", "unbekannt", "unknown", "n/a"]);
const CURRENT_YEAR = new Date().getFullYear();

function cell(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (UNKNOWN.has(trimmed.toLowerCase())) return null;
  return trimmed.slice(0, 80);
}

export function parseImport(text: string): {
  rows: ImportRow[];
  errors: string[];
} {
  const rows: ImportRow[] = [];
  const errors: string[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();

    // Leerzeilen und Kommentare überspringen.
    if (!trimmed || trimmed.startsWith("#")) return;

    const parts = trimmed.split(/\s*[|;\t]\s*/);
    const name = cell(parts[0]);

    if (!name) {
      errors.push(`Zeile ${line}: kein Pferdename erkennbar.`);
      return;
    }

    if (parts.length < 2) {
      errors.push(
        `Zeile ${line}: „${name}" hat keine Abstammung. Erwartet wird ` +
          `Pferd | Vater | Mutter.`,
      );
      return;
    }

    let yearOfBirth: number | null = null;
    const rawYear = cell(parts[3]);
    if (rawYear) {
      const parsed = Number(rawYear);
      if (!Number.isInteger(parsed) || parsed < 1850 || parsed > CURRENT_YEAR) {
        errors.push(`Zeile ${line}: „${rawYear}" ist kein gültiger Jahrgang.`);
      } else {
        yearOfBirth = parsed;
      }
    }

    rows.push({
      line,
      name,
      sireName: cell(parts[1]),
      damName: cell(parts[2]),
      yearOfBirth,
      color: cell(parts[4]),
    });
  });

  return { rows, errors };
}

/**
 * Leitet ab, welches Pferd Hengst und welches Stute ist. Das ist wichtig, weil
 * die Verknüpfung der Abstammung sonst nicht greift - ein Vater muss ein
 * Hengst sein, eine Mutter eine Stute.
 *
 * Drei Quellen, in dieser Reihenfolge:
 *   1. die eingefügte Liste selbst (Vaterspalte / Mutterspalte),
 *   2. der vorhandene Bestand - steht der Name dort schon als Mutter eines
 *      anderen Pferdes, ist es eine Stute,
 *   3. sonst Hengst, weil das Verzeichnis überwiegend Hengste führt.
 *
 * Punkt 2 fängt den häufigen Fall ab, dass jemand eine Stute nachträgt, die
 * bisher nur als Muttername in einem anderen Eintrag stand.
 */
function inferSexes(rows: ImportRow[]): Map<string, Sex> {
  const sexes = new Map<string, Sex>();

  for (const row of rows) {
    if (row.sireName) sexes.set(normalizeName(row.sireName), "stallion");
    if (row.damName) sexes.set(normalizeName(row.damName), "mare");
  }

  const conn = getDb();
  const asDam = conn.prepare(
    "SELECT 1 FROM horses WHERE dam_name_key = ? LIMIT 1",
  );
  const asSire = conn.prepare(
    "SELECT 1 FROM horses WHERE sire_name_key = ? LIMIT 1",
  );

  for (const row of rows) {
    const key = normalizeName(row.name);
    if (sexes.has(key)) continue;

    const existing = findHorseByName(row.name);
    if (existing) {
      sexes.set(key, existing.sex);
      continue;
    }

    if (asDam.get(key)) sexes.set(key, "mare");
    else if (asSire.get(key)) sexes.set(key, "stallion");
  }

  return sexes;
}

export function planImport(text: string): ImportPlan {
  const { rows, errors } = parseImport(text);
  const sexes = inferSexes(rows);
  const actions: ImportAction[] = [];
  const counts = { create: 0, update: 0, unchanged: 0 };

  // Namen, die im Lauf noch angelegt werden - damit ein Vorfahr, der in einer
  // späteren Zeile selbst steht, nicht doppelt als "wird angelegt" auftaucht.
  const planned = new Set<string>();

  const consider = (name: string, sireName: string | null, damName: string | null) => {
    const key = normalizeName(name);
    const existing = findHorseByName(name);
    const sex = sexes.get(key) ?? "stallion";

    if (!existing) {
      if (planned.has(key)) return;
      planned.add(key);
      counts.create++;
      actions.push({
        name,
        kind: "create",
        sex,
        detail:
          sireName || damName
            ? `wird angelegt mit ${sireName ?? "unbekannt"} x ${damName ?? "unbekannt"}`
            : "wird als Vorfahr angelegt (Abstammung noch offen)",
      });
      return;
    }

    // Vorhandene Einträge werden nur ergänzt, nie überschrieben.
    const addSire = sireName && !existing.sireName;
    const addDam = damName && !existing.damName;

    if (addSire || addDam) {
      counts.update++;
      const bits: string[] = [];
      if (addSire) bits.push(`Vater ${sireName}`);
      if (addDam) bits.push(`Mutter ${damName}`);
      actions.push({
        name: existing.name,
        kind: "update",
        sex: existing.sex,
        detail: `vorhanden - ${bits.join(" und ")} wird nachgetragen`,
      });
      return;
    }

    counts.unchanged++;
    actions.push({
      name: existing.name,
      kind: "unchanged",
      sex: existing.sex,
      detail: existing.sireName || existing.damName
        ? "vorhanden, Abstammung schon eingetragen"
        : "vorhanden",
    });
  };

  for (const row of rows) {
    consider(row.name, row.sireName, row.damName);
    // Eltern, die nirgends eine eigene Zeile haben, ebenfalls anlegen -
    // sonst bleiben sie blosser Text und der Baum wächst nicht weiter.
    for (const parent of [row.sireName, row.damName]) {
      if (!parent) continue;
      const hasOwnRow = rows.some(
        (r) => normalizeName(r.name) === normalizeName(parent),
      );
      if (!hasOwnRow) consider(parent, null, null);
    }
  }

  return { rows, actions, errors, counts };
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export function applyImport(text: string): ImportResult {
  const { rows, errors } = parseImport(text);
  const sexes = inferSexes(rows);
  const conn = getDb();

  let created = 0;
  let updated = 0;

  const ensure = (name: string, sireName: string | null, damName: string | null) => {
    const existing = findHorseByName(name);
    const sex = sexes.get(normalizeName(name)) ?? "stallion";

    if (!existing) {
      const input: HorseInput = {
        name,
        aka: null,
        sex,
        breed: null,
        registryNo: null,
        yearOfBirth: null,
        yearOfDeath: null,
        color: null,
        heightCm: null,
        country: null,
        location: null,
        studName: null,
        disciplines: [],
        description: null,
        showRecord: null,
        offspring: null,
        bloodlineNote: null,
        sireName,
        damName,
        genetics: {},
        availability: "unknown",
        photoUrl: null,
        photoCredit: null,
        videoUrl: null,
        websiteUrl: null,
        allbreedUrl: null,
        ownerName: null,
        contactEmail: null,
        contactPhone: null,
        isHistoric: true,
        isVerified: false,
        status: "approved",
        source: "import",
        submitterEmail: null,
        adminNote: null,
      };
      insertHorse(input);
      created++;
      return;
    }

    // Nur ergänzen, nie überschreiben - eingetragene Angaben bleiben stehen.
    const nextSire = existing.sireName || sireName;
    const nextDam = existing.damName || damName;

    if (nextSire !== existing.sireName || nextDam !== existing.damName) {
      conn
        .prepare(
          `UPDATE horses
           SET sire_name = @sire, dam_name = @dam,
               sire_name_key = @sireKey, dam_name_key = @damKey,
               updated_at = @now
           WHERE id = @id`,
        )
        .run({
          id: existing.id,
          sire: nextSire,
          dam: nextDam,
          sireKey: nextSire ? normalizeName(nextSire) : "",
          damKey: nextDam ? normalizeName(nextDam) : "",
          now: new Date().toISOString(),
        });
      updated++;
    }
  };

  const run = conn.transaction(() => {
    // Erst alle genannten Pferde anlegen, dann die Abstammungen setzen.
    // So findet die Verknüpfung anschliessend alle Beteiligten vor.
    for (const row of rows) {
      for (const parent of [row.sireName, row.damName]) {
        if (!parent) continue;
        const hasOwnRow = rows.some(
          (r) => normalizeName(r.name) === normalizeName(parent),
        );
        if (!hasOwnRow) ensure(parent, null, null);
      }
    }
    for (const row of rows) ensure(row.name, row.sireName, row.damName);
  });

  run();
  relinkAll();

  return { created, updated, errors };
}

/** Jahrgang und Farbe nachtragen, falls die Zeilen sie mitliefern. */
export function applyDetails(text: string): number {
  const { rows } = parseImport(text);
  const conn = getDb();
  let touched = 0;

  for (const row of rows) {
    if (row.yearOfBirth === null && row.color === null) continue;

    const horse = findHorseByName(row.name);
    if (!horse) continue;

    const year = horse.yearOfBirth ?? row.yearOfBirth;
    const color = horse.color ?? row.color;

    if (year !== horse.yearOfBirth || color !== horse.color) {
      conn
        .prepare(
          "UPDATE horses SET year_of_birth = @year, color = @color, updated_at = @now WHERE id = @id",
        )
        .run({ id: horse.id, year, color, now: new Date().toISOString() });
      touched++;
    }
  }

  return touched;
}
