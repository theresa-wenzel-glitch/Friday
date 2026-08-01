/* ============================================================================
   Regelbasierter Planer — erzeugt ohne Sprachmodell für jedes Ziel einen Plan.

   Drei Schichten, von konkret nach allgemein:

     1. Playbook   — redaktionell geprüft, aus engine/src/playbooks/data/.
                     Deckt heute drei Gründungsvorhaben ab.
     2. Fachmodul  — rund dreißig Lebensbereiche mit konkreten Schritten,
                     die sich in ein Grundmuster einklinken (domains.json).
     3. Grundmuster— sieben Zielformen, die jedes denkbare Ziel abdecken
                     (archetypes.json). Greift immer, auch wenn nichts passt.

   Was diese Datei ausdrücklich nicht ist: eine Wissensdatenbank. Sie kennt
   den typischen Weg für Ziele einer Art, nicht die Besonderheiten einer
   einzelnen Person. Genau das steht auch in den Annahmen jedes Plans.

   Diese Datei wird von demo/build.mjs in die Vorschau eingesetzt und von
   demo/test/planner.test.mjs unverändert geprüft — eine Quelle, zwei Nutzer.
   Erwartete Globale: ARCHETYPES, DOMAINS, PLAYBOOKS.
   ========================================================================== */

const PLANNER_MAX_TASK_MIN = 480;
const PLANNER_MIN_TASK_MIN = 15;
const HORIZON_MIN_DAYS = 21;
const HORIZON_MAX_DAYS = 1460;

/* --- Sicherheitsfilter ---------------------------------------------------
   Für diese Lagen ist eine Aufgabenliste die falsche Antwort. Portiert aus
   engine/src/pipeline.ts (SAFETY_RESPONSES). */

const SAFETY_RULES = [
  {
    kind: "krise",
    patterns: ["suizid", "selbstmord", "umbringen", "nicht mehr leben", "sterben will", "nicht mehr weiterleben", "selbstverletzung", "ritzen", "das leben nehmen"],
    message:
      "Dafür ist Atlas das falsche Werkzeug — und du sollst damit nicht allein bleiben. " +
      "Die Telefonseelsorge ist rund um die Uhr kostenlos und anonym erreichbar: 0800 111 0 111 " +
      "oder 0800 111 0 222. Im Notfall 112. Wenn du magst, plane hier etwas anderes — aber bitte " +
      "sprich zuerst mit einem Menschen.",
  },
  {
    kind: "essstoerung",
    patterns: ["magersucht", "bulimie", "essstörung", "hungern", "erbrechen nach dem essen", "nichts mehr essen", "kalorien unter 1000"],
    message:
      "Zu diesem Ziel erstellt Atlas keinen Plan. Ein Stufenplan kann hier schaden statt zu helfen. " +
      "Die Beratungsstelle der Bundeszentrale für gesundheitliche Aufklärung berät kostenlos und " +
      "anonym: 0221 892031. Wenn du an deinem Essen etwas ändern willst, geht das — aber gemeinsam " +
      "mit einer Ärztin oder einem Therapeuten.",
  },
  {
    kind: "unzulaessig",
    patterns: ["waffe bauen", "bombe", "sprengstoff", "drogen verkaufen", "einbrechen", "hacken von", "erpressen", "jemanden umbringen"],
    message:
      "Dabei helfe ich nicht. Wenn dahinter ein anderes Ziel steckt — Sicherheit, Geld, ein Konflikt —, " +
      "formuliere es direkt, dann planen wir das.",
  },
];

function safetyCheck(text) {
  const t = String(text).toLowerCase();
  for (const rule of SAFETY_RULES) {
    if (rule.patterns.some((p) => t.includes(p))) return { kind: rule.kind, message: rule.message };
  }
  return null;
}

/* --- Textauswertung ------------------------------------------------------ */

const NUMBER_WORDS = {
  "ein": 1, "einem": 1, "einer": 1, "eine": 1, "zwei": 2, "drei": 3, "vier": 4, "fünf": 5,
  "sechs": 6, "sieben": 7, "acht": 8, "neun": 9, "zehn": 10, "elf": 11, "zwölf": 12,
  "achtzehn": 18, "zwanzig": 20, "vierundzwanzig": 24,
};

const UNIT_DAYS = { tag: 1, woche: 7, monat: 30, jahr: 365 };

/** Liest eine Zeitangabe aus dem Zieltext: „in 18 Monaten“, „in einem halben Jahr“. */
function detectHorizonDays(text) {
  const t = String(text).toLowerCase();

  if (/in\s+(?:einem\s+)?halben\s+jahr/.test(t)) return 182;
  if (/in\s+(?:einem\s+)?dreivierteljahr/.test(t)) return 273;

  const m = t.match(/\b(?:in|binnen|innerhalb\s+von)\s+([\wäöüß]+)\s*(tag|woche|monat|jahr)/);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
    if (n && n > 0) return Math.round(n * UNIT_DAYS[m[2]]);
  }

  if (/\bnächstes\s+jahr\b|\bim\s+nächsten\s+jahr\b/.test(t)) return 365;
  if (/\bbis\s+ende\s+des\s+jahres\b|\bbis\s+jahresende\b/.test(t)) {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
    return Math.max(HORIZON_MIN_DAYS, Math.round((end - now) / 86400000));
  }
  return null;
}

const LEAD_INS = [
  /^ich\s+(?:möchte|will|würde\s+gerne|hätte\s+gerne?|muss|plane|träume\s+davon,?)\s+/i,
  /^mein\s+ziel\s+ist(?:\s+es)?,?\s+/i,
  /^ich\s+habe\s+vor,?\s+/i,
  /^wie\s+(?:kann|schaffe)\s+ich\s+(?:es,?\s+)?/i,
];

/** Macht aus „Ich möchte in 18 Monaten ein Café eröffnen“ → „ein Café eröffnen“. */
function extractGoalPhrase(text) {
  let s = String(text).trim().replace(/[.!?]+$/, "");
  for (const re of LEAD_INS) s = s.replace(re, "");
  s = s.replace(/\b(?:in|binnen|innerhalb\s+von)\s+[\wäöüß]+\s*(?:tagen?|wochen?|monaten?|jahren?)\b\s*/i, "");
  s = s.replace(/\bbis\s+ende\s+des\s+jahres\b\s*/i, "").replace(/\bnächstes\s+jahr\b\s*/i, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s.length >= 3 ? s : String(text).trim();
}

/* --- Zuordnung ----------------------------------------------------------- */

/** Stichwörter der redaktionellen Playbooks. Bewusst hier und nicht in den
    Playbook-Daten: die Daten beschreiben den Weg, nicht die Worterkennung. */
const PLAYBOOK_KEYWORDS = {
  "founding.gastronomy.cafe": ["café", "cafe", "kaffeehaus", "bistro", "restaurant", "gastronomie", "bäckerei", "imbiss", "bar eröffnen"],
  "founding.services.freelance": ["freelancer", "freiberuflich", "freiberufler", "selbstständig", "selbständig", "selbstständigkeit", "nebenberuflich", "agentur gründen"],
  "founding.retail.online": ["onlineshop", "online-shop", "e-commerce", "onlinehandel", "etsy", "dropshipping", "online verkaufen"],
};

function normalize(s) {
  return String(s).toLowerCase().replace(/\s+/g, " ");
}

/** Ein Treffer zählt so viel, wie das Stichwort lang ist — längere Wörter sind
    aussagekräftiger als kurze. Playbooks bekommen einen Bonus, weil sie
    redaktionell geprüft sind und nicht nur einem Muster folgen. */
function scoreKeywords(haystack, keywords) {
  let score = 0;
  const hits = [];
  for (const k of keywords) {
    if (haystack.includes(normalize(k))) { score += k.length; hits.push(k); }
  }
  return { score, hits };
}

function classifyGoal(text, playbooks) {
  const hay = normalize(text);
  const candidates = [];

  for (const p of playbooks || []) {
    const kw = PLAYBOOK_KEYWORDS[p.intentKey];
    if (!kw) continue;
    const { score, hits } = scoreKeywords(hay, kw);
    if (score > 0) candidates.push({ kind: "playbook", playbook: p, score: score * 2, hits });
  }

  for (const d of DOMAINS) {
    const { score, hits } = scoreKeywords(hay, d.keywords);
    if (score > 0) candidates.push({ kind: "domain", domain: d, score, hits });
  }

  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length) {
    const best = candidates[0];
    if (best.kind === "domain") {
      best.archetype = ARCHETYPES.find((a) => a.key === best.domain.archetype) || ARCHETYPES[1];
    }
    return best;
  }

  // Kein Fachmodul passt — dann bestimmt die Form des Ziels das Muster.
  let bestArch = null;
  for (const a of ARCHETYPES) {
    const { score, hits } = scoreKeywords(hay, a.detect || []);
    if (score > 0 && (!bestArch || score > bestArch.score)) bestArch = { archetype: a, score, hits };
  }
  const fallback = ARCHETYPES.find((a) => a.key === "vorhaben") || ARCHETYPES[0];
  return {
    kind: "archetype",
    archetype: bestArch ? bestArch.archetype : fallback,
    score: bestArch ? bestArch.score : 0,
    hits: bestArch ? bestArch.hits : [],
    generic: !bestArch,
  };
}

/* --- Zusammenbau --------------------------------------------------------- */

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function fill(str, phrase) {
  return String(str).replace(/\{ziel\}/g, phrase);
}

/** Verteilt den Zeitraum so auf die Etappen, dass die Summe exakt aufgeht —
    sonst reißt der kritische Pfad den Zieltermin um bloße Rundungstage.
    Überschuss wird bei den längsten Etappen abgezogen, nie unter die
    Mindestdauer; ein Rest wird auf die längste Etappe gelegt. */
function stageDurations(stages, horizonDays) {
  const n = stages.length;
  const minDays = Math.max(1, Math.min(5, Math.floor(horizonDays / n)));
  const raw = stages.map((s) => Math.max(minDays, Math.round(horizonDays * s.share)));
  let sum = raw.reduce((a, b) => a + b, 0);

  while (sum > horizonDays) {
    let idx = -1;
    for (let i = 0; i < n; i++) if (raw[i] > minDays && (idx === -1 || raw[i] > raw[idx])) idx = i;
    if (idx === -1) break;                      // alle Etappen sind am Minimum
    raw[idx] -= 1; sum -= 1;
  }
  while (sum < horizonDays) {
    let idx = 0;
    for (let i = 1; i < n; i++) if (raw[i] > raw[idx]) idx = i;
    raw[idx] += 1; sum += 1;
  }
  return raw;
}

/** Skaliert die Aufwände so, dass die Wochenlast in die Kapazität passt.
    Regel 5 des Validators prüft genau das — ein Plan, der sie reißt, ist
    kein Plan, sondern eine Wunschliste. */
function fitToCapacity(tasks, durationDays, weeklyCapacityMin) {
  const weeks = Math.max(durationDays / 7, 1 / 7);
  const budget = weeklyCapacityMin * weeks * 0.85;
  const sum = tasks.reduce((s, t) => s + t.estimatedMin, 0);
  if (sum <= budget) return tasks;

  const factor = budget / sum;
  return tasks.map((t) => ({
    ...t,
    estimatedMin: clamp(Math.round(t.estimatedMin * factor), PLANNER_MIN_TASK_MIN, PLANNER_MAX_TASK_MIN),
  }));
}

/* --- Ebene 1: Direktplan aus einem Playbook (engine/src/fallback.ts) ----- */

function orderNodes(template) {
  const ids = new Set(template.nodes.map((n) => n.id));
  const placed = new Set();
  const ordered = [];
  let progress = true;

  while (progress && ordered.length < template.nodes.length) {
    progress = false;
    for (const node of template.nodes) {
      if (placed.has(node.id)) continue;
      if (node.requiredBefore.every((r) => placed.has(r) || !ids.has(r))) {
        ordered.push(node); placed.add(node.id); progress = true;
      }
    }
  }
  for (const node of template.nodes) if (!placed.has(node.id)) ordered.push(node);
  return ordered;
}

function shorten(s, max = 90) {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

function playbookTasks(node, input) {
  const drafts = [
    { title: `${node.title}: Überblick verschaffen und Vorgehen festlegen`,
      why: "Ein klarer Startpunkt verhindert, dass dieser Meilenstein liegen bleibt.", blocking: true, min: 60 },
    ...node.successCorrelates.slice(0, 2).map((c) => ({
      title: c, why: "Das unterscheidet laut Playbook diejenigen, die abschließen, von denen, die aufgeben.", blocking: false, min: 180 })),
    { title: `Prüfen: ${shorten(node.definitionOfDone)}`,
      why: "Der Meilenstein gilt erst als erledigt, wenn dieses Ergebnis vorliegt.", blocking: true, min: 90 },
  ];

  return fitToCapacity(
    drafts.map((d) => ({ title: d.title, why: d.why, how: null, blocking: d.blocking, estimatedMin: d.min, origin: "playbook" })),
    node.typicalDurationDays,
    input.weeklyCapacityMin,
  );
}

function planFromPlaybook(template, input) {
  const nodes = orderNodes(template);
  const milestones = nodes.map((node) => ({
    ref: node.id, title: node.title, definitionOfDone: node.definitionOfDone,
    durationDays: node.typicalDurationDays, dependsOn: node.requiredBefore,
    origin: "playbook", playbookNodeId: node.id, tasks: playbookTasks(node, input),
  }));

  const totalDays = milestones.reduce((s, m) => s + m.durationDays, 0);

  return {
    summary: `${template.title} — geprüfter Weg aus dem Playbook „${template.intentKey}“. ` +
             `${milestones.length} Etappen über rund ${totalDays} Tage.`,
    assumptions: [
      "Dieser Plan stammt aus einem redaktionell erstellten Playbook und ist nicht auf deine Situation zugeschnitten.",
      `Die Zeitangaben sind Mediandauern aus dem Playbook (Stichprobe: ${template.sampleSize}).`,
      ...(input.experience === "none" ? ["Angenommen, du hast in diesem Bereich keine Vorerfahrung."] : []),
    ],
    risks: nodes.filter((n) => n.dropoutRate >= 0.2).map((n) => ({
      milestoneRef: n.id,
      risk: `An dieser Stelle geben laut Playbook ${Math.round(n.dropoutRate * 100)} % der Menschen auf.`,
      mitigation: n.successCorrelates[0] || "Schneide diesen Meilenstein kleiner.",
    })),
    milestones,
    meta: { archetypeKey: null, domainKey: null, playbookKey: template.intentKey, horizonDays: totalDays, horizonSource: "playbook", matchedOn: [] },
  };
}

/* --- Ebene 2 und 3: Fachmodul auf Grundmuster ---------------------------- */

function composePlan(input, match) {
  const phrase = extractGoalPhrase(input.rawInput);
  const archetype = match.archetype;
  const domain = match.kind === "domain" ? match.domain : null;

  // Zeitraum: Frist schlägt Zielsatz schlägt Erfahrungswert.
  const fromText = detectHorizonDays(input.rawInput);
  let horizonSource;
  let horizon;

  if (input.targetDate) {
    const days = Math.floor((new Date(input.targetDate) - new Date()) / 86400000);
    horizon = days - 2;                       // zwei Tage Luft vor dem Zieltermin
    horizonSource = "frist";
  } else if (fromText) {
    horizon = fromText;
    horizonSource = "zielsatz";
  } else {
    horizon = (domain && domain.horizonDays) || archetype.horizonDays;
    horizonSource = "erfahrungswert";
  }
  horizon = clamp(horizon, HORIZON_MIN_DAYS, HORIZON_MAX_DAYS);

  const durations = stageDurations(archetype.stages, horizon);
  const titles = (domain && domain.titles) || {};
  const inserts = (domain && domain.inserts) || {};

  const milestones = archetype.stages.map((stage, i) => {
    const own = stage.tasks.map((t) => ({
      title: fill(t.title, phrase),
      why: fill(t.why, phrase),
      how: t.how ? fill(t.how, phrase) : null,
      estimatedMin: t.min,
      blocking: !!t.blocking,
      origin: "muster",
    }));

    const extra = (inserts[stage.ref] || []).map((t) => ({
      title: fill(t.title, phrase),
      why: fill(t.why, phrase),
      how: t.how ? fill(t.how, phrase) : null,
      estimatedMin: t.min,
      blocking: !!t.blocking,
      origin: "fachmodul",
    }));

    // Fachwissen zuerst: es ist konkreter als das Grundmuster.
    const tasks = fitToCapacity([...extra, ...own], durations[i], input.weeklyCapacityMin);

    return {
      ref: stage.ref,
      title: titles[stage.ref] || stage.title,
      definitionOfDone: fill(stage.definitionOfDone, phrase),
      durationDays: durations[i],
      dependsOn: i === 0 ? [] : [archetype.stages[i - 1].ref],
      origin: extra.length ? "fachmodul" : "muster",
      tasks,
    };
  });

  const risks = ((domain && domain.risks) || [])
    .filter((r) => milestones.some((m) => m.ref === r.stage))
    .map((r) => ({ milestoneRef: r.stage, risk: r.risk, mitigation: r.mitigation }));

  const horizonNote = {
    frist: "Der Zeitraum kommt aus deiner Frist.",
    zielsatz: "Der Zeitraum ist aus deinem Zielsatz gelesen.",
    erfahrungswert: `Der Zeitraum von rund ${horizon} Tagen ist ein Erfahrungswert für Ziele dieser Art — keine Aussage über deinen Fall.`,
  }[horizonSource];

  const assumptions = [
    "Dieser Plan ist regelbasiert erstellt, nicht von einem Sprachmodell. Er nennt die Schritte, die für Ziele dieser Art typisch sind — nicht die Besonderheiten deiner Lage.",
    horizonNote,
    ...(domain
      ? [`Fachmodul „${domain.label}“ ergänzt das Grundmuster „${archetype.label}“ um konkrete Schritte.`]
      : [`Für dieses Ziel gibt es kein Fachmodul. Der Plan folgt dem allgemeinen Muster „${archetype.label}“ — die Etappen stimmen, die Einzelheiten musst du selbst füllen.`]),
    ...((domain && domain.assumptions) || []),
    ...(input.experience === "none" ? ["Angenommen, du hast in diesem Bereich keine Vorerfahrung."] : []),
    ...(input.budgetEur ? ["Das genannte Budget ist im Plan nicht auf einzelne Posten verteilt."] : []),
  ];

  const label = domain ? domain.label : archetype.label;
  const summary =
    `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} — ` +
    `${milestones.length} Etappen über rund ${horizon} Tage, ` +
    (domain ? `nach dem Fachmodul „${label}“.` : `nach dem Grundmuster „${label}“.`);

  return {
    summary,
    assumptions,
    risks,
    milestones,
    meta: {
      archetypeKey: archetype.key,
      domainKey: domain ? domain.key : null,
      horizonDays: horizon,
      horizonSource,
      matchedOn: match.hits || [],
    },
  };
}

/* --- Ein Einstiegspunkt für alle drei Ebenen ----------------------------- */

/**
 * Erzeugt für jedes Ziel einen Plan. Fällt niemals aus: gibt es kein Playbook
 * und kein Fachmodul, greift das Grundmuster, das zur Form des Ziels passt.
 * Nur bei den Lagen aus SAFETY_RULES gibt es bewusst keinen Plan.
 */
function buildPlan(input, playbooks) {
  const blocked = safetyCheck(input.rawInput);
  if (blocked) return { blocked };

  const match = classifyGoal(input.rawInput, playbooks);
  const plan = match.kind === "playbook"
    ? planFromPlaybook(match.playbook, input)
    : composePlan(input, match);

  return { plan, match };
}
