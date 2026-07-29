import { getHorseById } from "./db";
import type { Horse, PedigreeNode } from "./types";

/**
 * Baut den Abstammungsbaum eines Pferdes auf.
 *
 * Vorfahren, die selbst einen Datensatz haben, werden verlinkt und weiter
 * aufgeklappt. Vorfahren, die nur als Name in Vater-/Mutterfeld stehen,
 * werden als Endknoten dargestellt. So wächst der Stammbaum automatisch,
 * sobald jemand einen fehlenden Vorfahren nachträgt.
 */
export function buildPedigree(horse: Horse, generations = 4): PedigreeNode {
  const visited = new Set<number>();

  function nodeFromHorse(h: Horse, depth: number): PedigreeNode {
    return {
      name: h.name,
      slug: h.slug,
      id: h.id,
      yearOfBirth: h.yearOfBirth,
      color: h.color,
      sire: depth > 0 ? childNode(h.sireId, h.sireName, depth - 1) : null,
      dam: depth > 0 ? childNode(h.damId, h.damName, depth - 1) : null,
    };
  }

  function childNode(
    id: number | null,
    name: string | null,
    depth: number,
  ): PedigreeNode | null {
    // Zyklenschutz: fehlerhafte Daten könnten sonst eine Endlosschleife bauen.
    if (id !== null && !visited.has(id)) {
      visited.add(id);
      const parent = getHorseById(id);
      if (parent) return nodeFromHorse(parent, depth);
    }
    if (name?.trim()) {
      return {
        name: name.trim(),
        slug: null,
        id: null,
        yearOfBirth: null,
        color: null,
        sire: null,
        dam: null,
      };
    }
    return null;
  }

  visited.add(horse.id);
  return nodeFromHorse(horse, generations);
}

/**
 * Flacht den Baum in Spalten ab - eine je Generation. Jede Spalte enthält
 * 2^n Plätze in klassischer Pedigree-Reihenfolge (Vaterlinie oben).
 * Leere Plätze sind `null`.
 */
export function pedigreeColumns(
  root: PedigreeNode,
  generations: number,
): (PedigreeNode | null)[][] {
  const columns: (PedigreeNode | null)[][] = [];
  let level: (PedigreeNode | null)[] = [root.sire ?? null, root.dam ?? null];

  for (let gen = 0; gen < generations; gen++) {
    columns.push(level);
    const next: (PedigreeNode | null)[] = [];
    for (const node of level) {
      next.push(node?.sire ?? null, node?.dam ?? null);
    }
    level = next;
  }

  return columns;
}

/** Zählt, wie viele Vorfahren-Plätze tatsächlich gefüllt sind. */
export function pedigreeCompleteness(
  root: PedigreeNode,
  generations: number,
): { filled: number; total: number } {
  const columns = pedigreeColumns(root, generations);
  let filled = 0;
  let total = 0;
  for (const column of columns) {
    for (const node of column) {
      total++;
      if (node) filled++;
    }
  }
  return { filled, total };
}
