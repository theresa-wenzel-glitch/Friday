/**
 * Prüft den regelbasierten Planer — und zwar genau die Datei, die auch in die
 * Vorschau eingesetzt wird. Kein Nachbau, keine zweite Wahrheit.
 *
 *   node --test demo/test/
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const ARCHETYPES = load("demo/planner/archetypes.json");
const DOMAINS = load("demo/planner/domains.json");
const PLAYBOOKS = readdirSync(join(root, "engine/src/playbooks/data"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(root, "engine/src/playbooks/data", f), "utf8")));

const ctx = vm.createContext({ ARCHETYPES, DOMAINS, console });
vm.runInContext(readFileSync(join(root, "demo/planner/planner.js"), "utf8"), ctx);
const { classifyGoal, composePlan, detectHorizonDays, extractGoalPhrase, safetyCheck } = ctx;

const baseInput = (rawInput, extra = {}) => ({
  rawInput,
  weeklyCapacityMin: 6 * 60,
  experience: "some",
  includeWeekends: false,
  ...extra,
});

/* ---------------------------------------------------------------- Struktur */

test("jedes Grundmuster hat Etappen, deren Anteile sich zu 1 summieren", () => {
  for (const a of ARCHETYPES) {
    assert.ok(a.stages.length >= 5, `${a.key} hat nur ${a.stages.length} Etappen`);
    const sum = a.stages.reduce((s, st) => s + st.share, 0);
    assert.ok(Math.abs(sum - 1) < 0.001, `${a.key}: Anteile ergeben ${sum}`);
    const refs = new Set();
    for (const st of a.stages) {
      assert.ok(!refs.has(st.ref), `${a.key}: Kennung ${st.ref} doppelt`);
      refs.add(st.ref);
      assert.ok(st.definitionOfDone.length >= 15, `${a.key}/${st.ref}: Ergebnisdefinition zu kurz`);
      assert.ok(st.tasks.length >= 2, `${a.key}/${st.ref}: zu wenige Aufgaben`);
      for (const t of st.tasks) {
        assert.ok(t.min > 0 && t.min <= 480, `${a.key}/${st.ref}: „${t.title}“ hat ${t.min} Minuten`);
        assert.ok(t.why && t.why.length > 20, `${a.key}/${st.ref}: „${t.title}“ ohne Begründung`);
      }
    }
  }
});

test("jedes Fachmodul verweist auf ein vorhandenes Muster und echte Etappen", () => {
  const byKey = new Map(ARCHETYPES.map((a) => [a.key, a]));
  const seen = new Set();
  for (const d of DOMAINS) {
    assert.ok(!seen.has(d.key), `Fachmodul ${d.key} doppelt`);
    seen.add(d.key);
    const a = byKey.get(d.archetype);
    assert.ok(a, `${d.key} verweist auf unbekanntes Muster ${d.archetype}`);
    const refs = new Set(a.stages.map((s) => s.ref));
    for (const ref of Object.keys(d.inserts || {})) {
      assert.ok(refs.has(ref), `${d.key}: Einschub für unbekannte Etappe ${ref}`);
    }
    for (const ref of Object.keys(d.titles || {})) {
      assert.ok(refs.has(ref), `${d.key}: Titel für unbekannte Etappe ${ref}`);
    }
    for (const r of d.risks || []) {
      assert.ok(refs.has(r.stage), `${d.key}: Risiko für unbekannte Etappe ${r.stage}`);
    }
    assert.ok(d.keywords.length >= 3, `${d.key} hat zu wenige Stichwörter`);
  }
});

/* ------------------------------------------------------------- Textlesung */

test("Zeitangaben werden aus dem Zielsatz gelesen", () => {
  assert.equal(detectHorizonDays("Ich möchte in 18 Monaten ein Café eröffnen"), 540);
  assert.equal(detectHorizonDays("in zwei Jahren auswandern"), 730);
  assert.equal(detectHorizonDays("in 6 Wochen 5 km laufen"), 42);
  assert.equal(detectHorizonDays("in einem halben Jahr Spanisch sprechen"), 182);
  assert.equal(detectHorizonDays("Ich will Gitarre lernen"), null);
});

test("Einleitungen und Zeitangaben werden aus dem Zielsatz entfernt", () => {
  assert.equal(
    extractGoalPhrase("Ich möchte in 18 Monaten ein Café in Leipzig eröffnen"),
    "ein Café in Leipzig eröffnen",
  );
  assert.equal(extractGoalPhrase("Mein Ziel ist es, einen Marathon zu laufen"), "einen Marathon zu laufen");
  assert.equal(extractGoalPhrase("Klavier lernen"), "Klavier lernen");
});

/* ------------------------------------------------------------ Sicherheit */

test("für Krisen gibt es keinen Plan, sondern eine Nummer", () => {
  const r = safetyCheck("Ich will mich umbringen");
  assert.ok(r, "Krise nicht erkannt");
  assert.equal(r.kind, "krise");
  assert.match(r.message, /0800 111 0 111/);
  assert.equal(safetyCheck("Ich möchte einen Marathon laufen"), null);
});

test("Essstörungen und unzulässige Ziele werden abgefangen", () => {
  assert.equal(safetyCheck("Ich will hungern bis ich 40 kg wiege").kind, "essstoerung");
  assert.equal(safetyCheck("Ich will eine Bombe bauen").kind, "unzulaessig");
});

/* --------------------------------------------------------- Der Katalog --
   Sehr verschiedene Ziele. Für jedes muss ein brauchbarer Plan herauskommen. */

const KATALOG = [
  ["Ich möchte in 18 Monaten ein Café in Leipzig eröffnen", "playbook", "founding.gastronomy.cafe"],
  ["Ich will nebenberuflich als Freelancer starten", "playbook", "founding.services.freelance"],
  ["Ich möchte einen Onlineshop für Keramik aufbauen", "playbook", "founding.retail.online"],
  ["Ich will in einem Jahr einen Marathon laufen", "domain", "sport.marathon"],
  ["Ich möchte 10 km am Stück joggen können", "domain", "sport.laufen"],
  ["Ich will endlich Muskeln aufbauen und ins Fitnessstudio gehen", "domain", "sport.kraft"],
  ["Ich möchte 15 Kilo abnehmen", "domain", "gesundheit.gewicht"],
  ["Ich will mit dem Rauchen aufhören", "domain", "gesundheit.rauchen"],
  ["Ich möchte deutlich weniger Alkohol trinken", "domain", "gesundheit.alkohol"],
  ["Ich will endlich besser schlafen", "domain", "gesundheit.schlaf"],
  ["Ich möchte fließend Spanisch sprechen", "domain", "lernen.sprache"],
  ["Ich will programmieren lernen und Entwickler werden", "domain", "lernen.programmieren"],
  ["Ich möchte Klavier spielen lernen", "domain", "lernen.instrument"],
  ["Ich muss im Frühjahr eine Klausur in Statistik bestehen", "domain", "lernen.pruefung"],
  ["Ich will meinen Führerschein machen", "domain", "lernen.fuehrerschein"],
  ["Ich möchte einen neuen Job finden", "domain", "karriere.bewerbung"],
  ["Ich will eine Gehaltserhöhung verhandeln", "domain", "karriere.gehalt"],
  ["Ich möchte 20000 zurücklegen als Rücklage", "domain", "finanzen.sparen"],
  ["Ich will meine Schulden abbauen", "domain", "finanzen.schulden"],
  ["Wir möchten ein Haus kaufen", "domain", "finanzen.immobilie"],
  ["Ich plane einen Umzug nach Hamburg", "domain", "leben.umzug"],
  ["Ich brauche eine neue Mietwohnung", "domain", "leben.wohnung"],
  ["Wir wollen nächstes Jahr heiraten", "domain", "leben.hochzeit"],
  ["Ich möchte eine Weltreise machen", "domain", "leben.reise"],
  ["Ich will endlich den Keller ausmisten", "domain", "leben.aufraeumen"],
  ["Ich möchte einen Gemüsegarten anlegen", "domain", "leben.garten"],
  ["Ich will einen Roman schreiben", "domain", "kreativ.buch"],
  ["Ich möchte einen Podcast starten", "domain", "kreativ.kanal"],
  ["Ich brauche eine eigene Website", "domain", "digital.website"],
  ["Ich möchte neue Freunde finden", "domain", "sozial.kontakte"],

  // Ziele ohne Fachmodul — hier muss das Grundmuster greifen.
  ["Ich möchte lernen, wie man einen Bienenstock hält", "archetype", "faehigkeit"],
  ["Ich will ein Baumhaus für meine Kinder bauen", "archetype", "vorhaben"],
  ["Ich möchte meine Oma jede Woche anrufen", "archetype", "gewohnheit"],
  ["Ich will einen Segelschein machen", "archetype", null],
  ["Ich möchte meine Wohnung komplett renovieren", "archetype", null],
  ["Ich will ein Ehrenamt in der Nachbarschaft übernehmen", "archetype", null],
  ["Ich möchte in ein anderes Land auswandern", "archetype", "wechsel"],
  ["Ich will meine Plattensammlung digitalisieren", "archetype", null],
  ["Ich möchte einen Chor gründen", "archetype", null],
  ["Ich will die Bäckerei meines Großvaters wiederbeleben", "playbook", null],
];

test("der Katalog trifft die erwartete Ebene", () => {
  const abweichungen = [];
  for (const [ziel, ebene, key] of KATALOG) {
    const m = classifyGoal(ziel, PLAYBOOKS);
    const gefunden = m.kind === "playbook" ? m.playbook.intentKey
      : m.kind === "domain" ? m.domain.key
      : m.archetype.key;
    if (m.kind !== ebene) abweichungen.push(`„${ziel}“ → ${m.kind}/${gefunden}, erwartet ${ebene}`);
    else if (key && gefunden !== key) abweichungen.push(`„${ziel}“ → ${gefunden}, erwartet ${key}`);
  }
  assert.deepEqual(abweichungen, [], "\n" + abweichungen.join("\n"));
});

test("für jedes Ziel im Katalog entsteht ein brauchbarer Plan", () => {
  for (const [ziel] of KATALOG) {
    const { plan } = ctx.buildPlan(baseInput(ziel), PLAYBOOKS);

    assert.ok(plan.milestones.length >= 5, `${ziel}: nur ${plan.milestones.length} Etappen`);
    assert.ok(plan.summary.length > 30, `${ziel}: Zusammenfassung zu dünn`);
    assert.ok(plan.assumptions.length >= 2, `${ziel}: zu wenige Annahmen`);

    const refs = new Set();
    for (const m of plan.milestones) {
      assert.ok(!refs.has(m.ref), `${ziel}: Kennung ${m.ref} doppelt`);
      refs.add(m.ref);
      assert.ok(m.definitionOfDone.length >= 15, `${ziel}/${m.ref}: Ergebnisdefinition zu kurz`);
      assert.ok(m.durationDays >= 1, `${ziel}/${m.ref}: ${m.durationDays} Tage`);
      assert.ok(m.tasks.length >= 2, `${ziel}/${m.ref}: zu wenige Aufgaben`);
      for (const t of m.tasks) {
        assert.ok(t.estimatedMin > 0 && t.estimatedMin <= 480, `${ziel}: „${t.title}“ ${t.estimatedMin} Min`);
        assert.ok(!/\{ziel\}/.test(t.title + t.why + (t.how || "")), `${ziel}: Platzhalter nicht ersetzt`);
      }
    }
    for (const m of plan.milestones) {
      for (const dep of m.dependsOn) assert.ok(refs.has(dep), `${ziel}: ${m.ref} hängt an unbekanntem ${dep}`);
    }
    for (const r of plan.risks) {
      assert.ok(refs.has(r.milestoneRef), `${ziel}: Risiko zeigt auf unbekannte Etappe`);
    }
  }
});

test("die Wochenlast bleibt in der Kapazität — auch bei wenig Zeit", () => {
  for (const stunden of [1, 3, 6, 20]) {
    for (const [ziel] of KATALOG) {
      const { plan } = ctx.buildPlan(baseInput(ziel, { weeklyCapacityMin: stunden * 60 }), PLAYBOOKS);
      for (const m of plan.milestones) {
        const total = m.tasks.reduce((s, t) => s + t.estimatedMin, 0);
        const last = total / Math.max(m.durationDays / 7, 1 / 7);
        assert.ok(last <= stunden * 60 * 1.2 + 1,
          `${ziel} bei ${stunden} h/Woche: „${m.title}“ verlangt ${Math.round(last)} Min/Woche`);
      }
    }
  }
});

test("der kritische Pfad passt in die gesetzte Frist", () => {
  // Gilt für Fachmodul und Grundmuster. Playbook-Pläne tragen feste Mediandauern
  // aus den Daten; passen die nicht in die Frist, ist das eine echte Aussage und
  // Regel 4 des Validators meldet sie — sie wird hier bewusst nicht wegskaliert.
  for (const tage of [30, 90, 200, 400]) {
    const ziel = new Date(Date.now() + tage * 86400000).toISOString().slice(0, 10);
    for (const [text] of KATALOG) {
      const input = baseInput(text, { targetDate: ziel });
      const match = classifyGoal(text, PLAYBOOKS);
      if (match.kind === "playbook") continue;
      const plan = composePlan(input, match);
      const pfad = plan.milestones.reduce((s, m) => s + m.durationDays, 0);
      assert.ok(pfad <= tage, `„${text}“ bei ${tage} Tagen Frist: Pfad braucht ${pfad}`);
    }
  }
});

test("eine sehr kurze Frist erzeugt trotzdem einen vollständigen Plan", () => {
  // Unter drei Wochen staucht der Planer nicht weiter — er liefert den kürzest
  // sinnvollen Plan. Dass der nicht in die Frist passt, meldet Regel 4, statt
  // dass hier eine Zahl schöngerechnet wird.
  const ziel = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const input = baseInput("Ich will nächste Woche meine Wohnung ausmisten", { targetDate: ziel });
  const plan = composePlan(input, classifyGoal(input.rawInput, PLAYBOOKS));
  assert.ok(plan.milestones.length >= 5);
  assert.ok(plan.milestones.every((m) => m.durationDays >= 1));
  assert.equal(plan.meta.horizonDays, 21);
});

test("die Etappendauern ergeben zusammen genau den Zeitraum", () => {
  for (const tage of [21, 45, 100, 365, 800]) {
    for (const a of ARCHETYPES) {
      const text = "Ich will etwas erreichen";
      const plan = composePlan(
        baseInput(text, { targetDate: new Date(Date.now() + (tage + 2) * 86400000).toISOString().slice(0, 10) }),
        { kind: "archetype", archetype: a },
      );
      const sum = plan.milestones.reduce((s, m) => s + m.durationDays, 0);
      assert.equal(sum, plan.meta.horizonDays, `${a.key} bei ${tage} Tagen`);
    }
  }
});

test("die Frist schlägt den Zeitraum aus dem Zielsatz", () => {
  const ziel = new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10);
  const text = "Ich möchte in 18 Monaten fließend Spanisch sprechen";
  const plan = composePlan(baseInput(text, { targetDate: ziel }), classifyGoal(text, PLAYBOOKS));
  assert.equal(plan.meta.horizonSource, "frist");
  assert.ok(plan.meta.horizonDays <= 100);

  const ohne = composePlan(baseInput(text), classifyGoal(text, PLAYBOOKS));
  assert.equal(ohne.meta.horizonSource, "zielsatz");
  assert.equal(ohne.meta.horizonDays, 540);
});

test("ohne Fachmodul sagt der Plan das ausdrücklich", () => {
  const text = "Ich möchte einen Bienenstock aufstellen";
  const plan = composePlan(baseInput(text), classifyGoal(text, PLAYBOOKS));
  assert.ok(plan.assumptions.some((a) => a.includes("kein Fachmodul")),
    "Der Plan verschweigt, dass er allgemein ist:\n" + plan.assumptions.join("\n"));
});

test("Fachmodulschritte stehen vor den allgemeinen", () => {
  const text = "Ich will einen Marathon laufen";
  const plan = composePlan(baseInput(text), classifyGoal(text, PLAYBOOKS));
  const stage = plan.milestones.find((m) => m.ref === "hoehepunkt");
  assert.equal(stage.tasks[0].origin, "fachmodul");
  assert.match(stage.tasks[0].title, /30 Kilometer/);
});

test("kein Text löst eine Warnung des Validators zu Regel 9 aus", () => {
  const muster = [
    { re: /\b\d{1,4}(?:[.,]\d{2})?\s?(?:€|EUR|Euro)\b/, hinweis: "Betrag" },
    { re: /\binnerhalb\s+von\s+\d+\s+(?:Tagen|Wochen|Monaten)\b/i, hinweis: "Frist" },
    { re: /§\s?\d+/, hinweis: "Paragraf" },
  ];
  const treffer = [];
  for (const [ziel] of KATALOG) {
    const { plan } = ctx.buildPlan(baseInput(ziel), PLAYBOOKS);
    for (const m of plan.milestones) {
      const texte = [m.definitionOfDone, ...m.tasks.flatMap((t) => [t.title, t.why, t.how || ""])];
      for (const { re, hinweis } of muster) {
        const hit = texte.find((t) => re.test(t));
        if (hit) treffer.push(`${m.ref}: ${hinweis} in „${hit.slice(0, 70)}“`);
      }
    }
  }
  assert.deepEqual([...new Set(treffer)], []);
});
