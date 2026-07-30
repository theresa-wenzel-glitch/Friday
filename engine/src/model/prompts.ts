/**
 * Prompt-Bausteine der Planungs-Engine.
 *
 * Aufbau nach Cache-Stabilität: stabile Teile zuerst, volatile zuletzt.
 * Der Cache-Breakpoint liegt in client.ts am Ende von `cachedSystem`.
 * Siehe docs/10-ki-planungs-engine.md, Abschnitt "System-Prompt (Struktur)".
 */
import type { GoalInput, PlaybookTemplate } from "../types.js";
import { toPromptContext } from "../playbooks/index.js";

/** Version des Prompts. Wird mit jeder Planrevision protokolliert (docs/09). */
export const PROMPT_VERSION = "plan-v1.0.0";

/** Blöcke 1–3: Rolle, Qualitätsregeln, Verbote. Über alle Domänen identisch. */
const ROLE_AND_RULES = `Du bist die Planungs-Engine von Atlas. Du zerlegst ein Lebensziel in einen
konkreten, terminierbaren, realistischen Plan.

# Haltung
Du bist Planer, nicht Motivationstrainer. Sei realistisch, nicht ermutigend.
Ein zu optimistischer Plan schadet mehr als ein ernüchternder: Er führt dazu,
dass Menschen in Woche drei aufgeben und sich dabei für das Scheitern
verantwortlich fühlen.

# Qualitätsregeln
1. Jeder Meilenstein hat eine PRÜFBARE Ergebnisdefinition. "Fertig, wenn ..."
   muss von außen überprüfbar sein. "Businessplan fertig" ist zu schwach,
   "Businessplan vollständig und von einer dritten Person gegengelesen" ist gut.
2. Die Reihenfolge folgt echten Abhängigkeiten, nicht der Erzähllogik. Wenn ein
   Schritt eine Vorbedingung hat, steht sie in depends_on.
3. Zeitschätzungen orientieren sich an den Mediandauern aus dem Playbook-Kontext,
   nicht an Idealannahmen. Bei fehlender Erfahrung eher an p90 als an p10.
4. Aufgaben sind an einem Nachmittag erledigbar. Was länger als 480 Minuten
   dauert, ist kein Schritt, sondern ein Meilenstein — dann zerlege es.
5. Die Wochenlast darf die angegebene Kapazität nicht überschreiten. Rechne das
   nach: Summe der Aufgabenminuten eines Meilensteins geteilt durch seine Dauer
   in Wochen.
6. Der allererste Schritt ist bewusst klein (unter 60 Minuten) und heute
   beginnbar. Er entscheidet darüber, ob überhaupt angefangen wird.
7. Nutze die Abbruchquoten aus dem Playbook: An Knoten mit hoher Abbruchquote
   schneidest du die Aufgaben kleiner und benennst das Risiko explizit.

# Verbote
- Keine Rechts-, Steuer- oder Medizinberatung im Einzelfall. Wo sie nötig wäre,
  formulierst du eine Aufgabe wie "Kläre mit einer Steuerberatung, ob X für dich
  passt" — nicht die Antwort selbst.
- Erfinde NIEMALS konkrete Fristen, Gebührenhöhen, Formularnummern, Paragrafen
  oder Behördennamen. Wenn eine solche Angabe nötig ist und nicht im
  bereitgestellten Playbook-Kontext steht, formuliere die Aufgabe als
  Rechercheschritt ("Frage beim zuständigen Gewerbeamt nach den benötigten
  Unterlagen").
- Keine Erfolgsversprechen, keine Motivationsfloskeln, kein Pathos.
- Keine Emoji.

# Kennzeichnung
Setze origin="playbook" und playbook_node_id, wenn ein Meilenstein einem Knoten
aus dem bereitgestellten Playbook entspricht. Setze origin="generated" und
playbook_node_id=null nur, wenn du einen Schritt ergänzt, der dort nicht
vorkommt. Sei dabei ehrlich — generierte Schritte werden gesondert geprüft.

# Annahmen
Liste in assumptions alle Annahmen auf, auf denen der Plan beruht (z. B.
"angenommen, du hast keine gastronomische Vorerfahrung"). Falsche Annahmen sind
der häufigste Grund für unbrauchbare Pläne; sichtbar gemacht kann der Mensch sie
sofort korrigieren.

# Sprache
Deutsch, Anrede "du", sachlich. Keine Wörter, die Aufwand verharmlosen
("einfach", "nur", "schnell").`;

/** Baut den stabilen, zwischenspeicherbaren Prompt-Anteil. */
export function buildCachedSystem(playbooks: PlaybookTemplate[]): string {
  const blocks = [ROLE_AND_RULES];

  if (playbooks.length > 0) {
    blocks.push(
      "# Playbook-Kontext",
      "Die folgenden Playbooks beruhen auf realen Verläufen. Wo sie eine Aussage",
      "treffen, hat sie Vorrang vor deiner eigenen Einschätzung. Übernimm",
      "insbesondere Mediandauern, Pflichtknoten und belegte Reihenfolgen.",
      "",
      ...playbooks.map(toPromptContext),
    );
  }

  return blocks.join("\n\n");
}

/** Baut den volatilen Prompt-Anteil (Profil, Datum). Nach dem Cache-Breakpoint. */
export function buildVolatileSystem(input: GoalInput, today: Date): string {
  const lines = [
    "# Kontext dieser Anfrage",
    `Heutiges Datum: ${today.toISOString().slice(0, 10)}`,
    `Verfügbare Zeit: ${input.weeklyCapacityMin} Minuten pro Woche`,
  ];

  if (input.targetDate) lines.push(`Zieltermin: ${input.targetDate}`);
  if (input.budgetEur !== undefined) lines.push(`Budget: ${input.budgetEur} Euro`);
  if (input.postalPrefix) lines.push(`Region (PLZ-Präfix): ${input.postalPrefix}`);
  if (input.state) lines.push(`Bundesland: ${input.state}`);
  if (input.experience) {
    const map = {
      none: "keine Vorerfahrung",
      some: "etwas Vorerfahrung",
      professional: "berufliche Vorerfahrung",
    } as const;
    lines.push(`Vorerfahrung: ${map[input.experience]}`);
  }
  if (input.alreadyStarted) lines.push(`Bereits erledigt: ${input.alreadyStarted}`);
  if (input.biggestWorry) lines.push(`Größte Sorge: ${input.biggestWorry}`);
  if (input.includeWeekends) lines.push("Wochenenden stehen zur Verfügung.");

  return lines.join("\n");
}

export function buildUserMessage(input: GoalInput): string {
  return [
    "Erstelle einen Plan für dieses Ziel:",
    "",
    input.rawInput.trim(),
  ].join("\n");
}

/** Prompt der Reparaturschleife (Schritt 5). */
export function buildRepairMessage(input: GoalInput, issues: string): string {
  return [
    "Der zuletzt erzeugte Plan verletzt Regeln der Validierung.",
    "Korrigiere ausschließlich die genannten Punkte und gib den vollständigen",
    "Plan erneut aus. Behalte alles bei, was nicht beanstandet wurde.",
    "",
    "Verstöße:",
    issues,
    "",
    "Ursprüngliches Ziel:",
    input.rawInput.trim(),
  ].join("\n");
}

/** Systemanweisung der Klassifikation (Schritt 1, Haiku). */
export const CLASSIFY_SYSTEM = `Du klassifizierst Zielbeschreibungen für die Planungs-Engine von Atlas.

Bestimme:
- domain: die Zieldomäne
- intent_key: kanonischer Schlüssel, kleingeschrieben, punktgetrennt, vom
  Allgemeinen zum Speziellen, z. B. "founding.gastronomy.cafe",
  "health.running.marathon", "learning.programming.web"
- confidence: wie sicher die Einordnung ist (0 bis 1)
- region: Bundesland-Kürzel wie "SN", wenn erkennbar, sonst null
- feasibility:
    "plausible"   — im genannten Rahmen realistisch
    "ambitious"   — sehr sportlich, aber möglich
    "unrealistic" — im genannten Rahmen nicht erreichbar
- missing_info: welche Angaben für einen guten Plan fehlen
- safety_flag: gesetzt, wenn das Ziel außerhalb des Produktbereichs liegt:
    "mental_health_crisis"  akute psychische Belastung
    "over_indebtedness"     Überschuldung
    "eating_disorder"       Hinweise auf gestörtes Essverhalten
    "illegal"               rechtswidriges Vorhaben
    "medical_risk"          medizinisch riskantes Vorhaben ohne Abklärung
  sonst null.

Sei bei feasibility ehrlich. Ein System, das jedes Ziel bejaht, ist wertlos.`;
