import type { MatchReason, MatchWeights } from "@jobflow/types";
import { DEFAULT_MATCH_WEIGHTS } from "@jobflow/types";

/**
 * Die Matching-Engine.
 *
 * Sie ist absichtlich eine reine Funktion ohne Datenbankzugriff: so laesst sie
 * sich einzeln testen, und die Gewichte lassen sich spaeter anhand echter
 * Daten nachjustieren, ohne die Abfragen anzufassen.
 *
 * Die Gewichte sind ein Startmodell, keine Wahrheit. Welche Faktoren
 * tatsaechlich zu Auftraegen fuehren, zeigt sich erst im Betrieb.
 */

export interface CandidateInput {
  businessId: string;
  /** Bietet das Unternehmen die gesuchte Kategorie an? */
  matchesCategory: boolean;
  /** Bietet es die Oberkategorie an, aber nicht die konkrete Unterkategorie? */
  matchesParentCategory: boolean;
  /** Entfernung zur Anfrage in Kilometern; null, wenn Koordinaten fehlen. */
  distanceKm: number | null;
  /** Wie weit das Unternehmen faehrt. */
  serviceRadiusKm: number;
  /** Hat es fuer den gewuenschten Zeitraum Verfuegbarkeit hinterlegt? */
  hasAvailability: boolean;
  rating: number | null;
  reviewCount: number;
  completedJobCount: number;
  avgResponseMinutes: number | null;
  /** Preisspanne der passenden Leistung in Cent. */
  priceMinCents: number | null;
  priceMaxCents: number | null;
  verified: boolean;
}

export interface ScoredCandidate {
  businessId: string;
  score: number;
  reasons: MatchReason[];
  distanceKm: number | null;
}

export interface ScoringOptions {
  weights?: MatchWeights;
  /** Median der Preisspannen aller Kandidaten - Bezugspunkt fuer den Preisfaktor. */
  referencePriceCents?: number | null;
}

/** Ein Kandidat, dessen Anteil an einem Faktor 0 bis 1 betraegt. */
type FactorScores = Record<keyof MatchWeights, number>;

export function scoreCandidate(candidate: CandidateInput, options: ScoringOptions = {}): ScoredCandidate {
  const weights = options.weights ?? DEFAULT_MATCH_WEIGHTS;
  const factors = computeFactors(candidate, options.referencePriceCents ?? null);

  const reasons: MatchReason[] = [];
  let total = 0;
  for (const key of Object.keys(weights) as (keyof MatchWeights)[]) {
    const points = factors[key] * weights[key];
    total += points;
    const label = describe(key, candidate, factors[key]);
    if (label !== null) reasons.push({ factor: key, label, points: round(points) });
  }

  return {
    businessId: candidate.businessId,
    score: Math.round(clamp(total, 0, 100)),
    // Die staerksten Gruende zuerst - die App zeigt nur die obersten an.
    reasons: reasons.sort((a, b) => b.points - a.points),
    distanceKm: candidate.distanceKm,
  };
}

function computeFactors(candidate: CandidateInput, referencePriceCents: number | null): FactorScores {
  return {
    // Die passende Leistung ist der wichtigste Faktor. Eine Uebereinstimmung
    // nur auf Ebene der Oberkategorie zaehlt deutlich weniger.
    service: candidate.matchesCategory ? 1 : candidate.matchesParentCategory ? 0.45 : 0,

    distance: distanceFactor(candidate.distanceKm, candidate.serviceRadiusKm),

    availability: candidate.hasAvailability ? 1 : 0,

    rating: ratingFactor(candidate.rating, candidate.reviewCount),

    price: priceFactor(candidate.priceMinCents, candidate.priceMaxCents, referencePriceCents),

    // Erfahrung waechst schnell und flacht dann ab: der Unterschied zwischen
    // 0 und 10 Auftraegen sagt viel mehr aus als der zwischen 200 und 210.
    experience: saturate(candidate.completedJobCount, 25),

    responseTime: responseFactor(candidate.avgResponseMinutes),
  };
}

/**
 * Entfernung.
 *
 * Innerhalb des eigenen Einsatzradius faellt der Wert linear ab, ausserhalb
 * ist er 0 - ein Betrieb, der nicht hinfaehrt, ist kein Treffer, egal wie gut
 * er sonst passt.
 */
function distanceFactor(distanceKm: number | null, serviceRadiusKm: number): number {
  // Ohne Koordinaten laesst sich nichts sagen. Ein mittlerer Wert ist ehrlicher
  // als eine 0 (die den Betrieb aussortieren wuerde) oder eine 1 (die ihn
  // gegenueber Betrieben mit Angabe bevorzugen wuerde).
  if (distanceKm === null) return 0.5;
  if (distanceKm > serviceRadiusKm) return 0;
  return clamp(1 - distanceKm / serviceRadiusKm, 0, 1);
}

/**
 * Bewertung.
 *
 * Wenige Bewertungen sind wenig aussagekraeftig, deshalb wird der Ausschlag
 * gedaempft: ein Betrieb mit 5,0 aus einer Bewertung soll einen mit 4,7 aus
 * 200 Bewertungen nicht ueberholen. Ohne Bewertungen gibt es den Mittelwert -
 * neue Betriebe sollen eine Chance bekommen.
 */
function ratingFactor(rating: number | null, reviewCount: number): number {
  if (rating === null || reviewCount === 0) return 0.5;
  const normalized = clamp((rating - 1) / 4, 0, 1);
  const trust = saturate(reviewCount, 20);
  return 0.5 + (normalized - 0.5) * trust;
}

/**
 * Preis.
 *
 * Guenstiger ist besser, aber nur maessig gewichtet: der billigste Anbieter
 * ist selten der beste. Ohne Preisangabe gibt es den Mittelwert.
 */
function priceFactor(minCents: number | null, maxCents: number | null, referenceCents: number | null): number {
  if (referenceCents === null || referenceCents <= 0) return 0.5;
  const own = midpoint(minCents, maxCents);
  if (own === null) return 0.5;
  // Halber Referenzpreis -> 1, doppelter -> 0.
  const ratio = own / referenceCents;
  return clamp(1 - (ratio - 0.5) / 1.5, 0, 1);
}

function responseFactor(avgResponseMinutes: number | null): number {
  if (avgResponseMinutes === null) return 0.5;
  // Unter 15 Minuten ist hervorragend, ab 24 Stunden zaehlt es nicht mehr.
  if (avgResponseMinutes <= 15) return 1;
  if (avgResponseMinutes >= 1440) return 0;
  return clamp(1 - (avgResponseMinutes - 15) / (1440 - 15), 0, 1);
}

function describe(factor: keyof MatchWeights, candidate: CandidateInput, value: number): string | null {
  switch (factor) {
    case "service":
      if (candidate.matchesCategory) return "Bietet genau diese Leistung an";
      if (candidate.matchesParentCategory) return "Arbeitet in diesem Bereich";
      return null;
    case "distance":
      if (candidate.distanceKm === null) return null;
      return `${formatKm(candidate.distanceKm)} entfernt`;
    case "availability":
      return candidate.hasAvailability ? "Hat freie Zeiten hinterlegt" : null;
    case "rating":
      if (candidate.rating === null || candidate.reviewCount === 0) return null;
      return `${candidate.rating.toFixed(1).replace(".", ",")} aus ${candidate.reviewCount} Bewertungen`;
    case "price":
      if (value <= 0.5) return null;
      return "Preislich guenstig";
    case "experience":
      if (candidate.completedJobCount === 0) return null;
      return `${candidate.completedJobCount} abgeschlossene Auftraege`;
    case "responseTime":
      if (candidate.avgResponseMinutes === null) return null;
      return `Antwortet im Schnitt in ${formatMinutes(candidate.avgResponseMinutes)}`;
  }
}

function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} Min.`;
  return `${Math.round(minutes / 60)} Std.`;
}

function midpoint(min: number | null, max: number | null): number | null {
  if (min !== null && max !== null) return (min + max) / 2;
  return min ?? max;
}

/** Waechst von 0 gegen 1 und erreicht bei `half` genau 0,5. */
function saturate(value: number, half: number): number {
  if (value <= 0) return 0;
  return value / (value + half);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export { DEFAULT_MATCH_WEIGHTS };
