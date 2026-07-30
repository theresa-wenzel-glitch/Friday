import { describe, expect, it } from "vitest";
import {
  findSimilar,
  getPlaybook,
  loadPlaybooks,
  requiredNodes,
  riskiestNode,
  toPromptContext,
} from "../src/playbooks/index.js";
import { topologicalOrder } from "../src/validator.js";

describe("Playbook-Speicher", () => {
  const playbooks = loadPlaybooks();

  it("lädt alle Playbooks", () => {
    expect(playbooks.length).toBeGreaterThanOrEqual(3);
  });

  it("jedes Playbook hat einen eindeutigen Intent-Key", () => {
    const keys = playbooks.map((p) => p.intentKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("findet ein Café-Playbook zur passenden Zielbeschreibung", () => {
    const matches = findSimilar("Ich möchte ein Café in Leipzig eröffnen", {
      intentKey: "founding.gastronomy.cafe",
    });
    expect(matches[0]?.template.intentKey).toBe("founding.gastronomy.cafe");
  });

  it("liefert für ein fachfremdes Ziel keine hohe Übereinstimmung", () => {
    const matches = findSimilar("Ich möchte einen Marathon laufen", {});
    expect(matches[0]?.score ?? 0).toBeLessThan(0.5);
  });
});

describe("Playbook-Struktur", () => {
  const playbooks = loadPlaybooks();

  it.each(playbooks.map((p) => [p.intentKey, p] as const))(
    "%s: Knoten bilden einen azyklischen Graphen",
    (_key, playbook) => {
      const asMilestones = playbook.nodes.map((n) => ({
        ref: n.id,
        title: n.title,
        definitionOfDone: n.definitionOfDone,
        durationDays: n.typicalDurationDays,
        dependsOn: n.requiredBefore,
        origin: "playbook" as const,
        playbookNodeId: n.id,
        tasks: [],
      }));

      expect(topologicalOrder(asMilestones)).toHaveLength(playbook.nodes.length);
    },
  );

  it.each(playbooks.map((p) => [p.intentKey, p] as const))(
    "%s: alle requiredBefore-Referenzen existieren",
    (_key, playbook) => {
      const ids = new Set(playbook.nodes.map((n) => n.id));
      for (const n of playbook.nodes) {
        for (const req of n.requiredBefore) expect(ids.has(req)).toBe(true);
      }
    },
  );

  it.each(playbooks.map((p) => [p.intentKey, p] as const))(
    "%s: alle Kanten verweisen auf existierende Knoten",
    (_key, playbook) => {
      const ids = new Set(playbook.nodes.map((n) => n.id));
      for (const e of playbook.edges) {
        expect(ids.has(e.from)).toBe(true);
        expect(ids.has(e.to)).toBe(true);
      }
    },
  );

  it.each(playbooks.map((p) => [p.intentKey, p] as const))(
    "%s: Dauern sind plausibel geordnet (p10 ≤ Median ≤ p90)",
    (_key, playbook) => {
      for (const n of playbook.nodes) {
        expect(n.p10DurationDays).toBeLessThanOrEqual(n.typicalDurationDays);
        expect(n.typicalDurationDays).toBeLessThanOrEqual(n.p90DurationDays);
      }
    },
  );

  it.each(playbooks.map((p) => [p.intentKey, p] as const))(
    "%s: Abbruchquoten liegen zwischen 0 und 1",
    (_key, playbook) => {
      for (const n of playbook.nodes) {
        expect(n.dropoutRate).toBeGreaterThanOrEqual(0);
        expect(n.dropoutRate).toBeLessThanOrEqual(1);
      }
    },
  );

  it.each(playbooks.map((p) => [p.intentKey, p] as const))(
    "%s: hat mindestens einen Pflichtknoten",
    (_key, playbook) => {
      expect(requiredNodes(playbook).length).toBeGreaterThan(0);
    },
  );

  it("ungeprüfte Playbooks sind als solche gekennzeichnet", () => {
    // Solange keine fachkundige Person geprüft hat, muss der Status ehrlich sein.
    for (const p of playbooks) {
      expect(["unreviewed_draft", "expert_reviewed"]).toContain(p.reviewStatus);
      if (p.sampleSize === 0) expect(p.reviewStatus).toBe("unreviewed_draft");
    }
  });
});

describe("Prompt-Kontext", () => {
  it("enthält Mediandauern, Abbruchquoten und Erfolgs-Korrelate", () => {
    const cafe = getPlaybook("founding.gastronomy.cafe")!;
    const ctx = toPromptContext(cafe);

    expect(ctx).toContain("Median");
    expect(ctx).toContain("Abbruchquote");
    expect(ctx).toContain("Was Erfolgreiche anders machen");
    expect(ctx).toContain("[PFLICHT]");
  });

  it("hebt Reihenfolgen mit belegtem Effekt hervor", () => {
    const cafe = getPlaybook("founding.gastronomy.cafe")!;
    const ctx = toPromptContext(cafe);

    expect(ctx).toContain("Reihenfolgen mit belegtem Effekt");
    expect(ctx).toContain("cafe.market");
  });

  it("benennt den kritischsten Knoten des Café-Playbooks", () => {
    const cafe = getPlaybook("founding.gastronomy.cafe")!;
    // Der Businessplan ist laut Playbook die häufigste Abbruchstelle.
    expect(riskiestNode(cafe)?.id).toBe("cafe.businessplan");
  });
});
