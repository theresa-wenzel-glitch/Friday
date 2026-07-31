import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  allowAttempt,
  checkPasswordStrength,
  clearAttempts,
  clearCookie,
  hashPassword,
  hashToken,
  isPlausibleEmail,
  issueSession,
  newUserId,
  normalizeEmail,
  parseCookies,
  sessionCookie,
  verifyPassword,
} from "../src/auth.js";
import {
  createGoal,
  createSession,
  createUser,
  deleteGoal,
  deleteSession,
  deleteUser,
  exportUserData,
  findUserByEmail,
  getGoal,
  listGoals,
  setTaskStatus,
  userForToken,
  type User,
} from "../src/store.js";
import { planFromPlaybook } from "../src/fallback.js";
import { getPlaybook } from "../src/playbooks/index.js";
import { schedulePlan } from "../src/scheduler.js";
import { input } from "./fixtures.js";

describe("Passwörter", () => {
  it("speichert niemals das Klartextpasswort", () => {
    const stored = hashPassword("ein-gutes-passwort");
    expect(stored).not.toContain("ein-gutes-passwort");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("erzeugt für dasselbe Passwort unterschiedliche Hashes", () => {
    // Individuelles Salt — gleiche Passwörter dürfen nicht gleich aussehen.
    expect(hashPassword("dasselbe-passwort")).not.toBe(hashPassword("dasselbe-passwort"));
  });

  it("bestätigt das richtige Passwort", () => {
    const stored = hashPassword("korrekt-pferd-batterie");
    expect(verifyPassword("korrekt-pferd-batterie", stored)).toBe(true);
  });

  it("lehnt ein falsches Passwort ab", () => {
    const stored = hashPassword("korrekt-pferd-batterie");
    expect(verifyPassword("korrekt-pferd-batterei", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("stürzt bei kaputtem Hash nicht ab", () => {
    expect(verifyPassword("egal", "unsinn")).toBe(false);
    expect(verifyPassword("egal", "bcrypt$a$b")).toBe(false);
  });

  it("weist zu schwache Passwörter zurück", () => {
    expect(checkPasswordStrength("kurz")).toContain("10 Zeichen");
    expect(checkPasswordStrength("12345678901")).toContain("Ziffern");
    expect(checkPasswordStrength("passwort123")).toContain("Wörterliste");
    expect(checkPasswordStrength("blauer-kaffee-montag")).toBeNull();
  });
});

describe("E-Mail", () => {
  it("normalisiert Groß- und Kleinschreibung sowie Leerzeichen", () => {
    expect(normalizeEmail("  Maja@Beispiel.DE ")).toBe("maja@beispiel.de");
  });

  it("erkennt offensichtlich ungültige Adressen", () => {
    expect(isPlausibleEmail("maja@beispiel.de")).toBe(true);
    expect(isPlausibleEmail("maja@beispiel")).toBe(false);
    expect(isPlausibleEmail("maja")).toBe(false);
    expect(isPlausibleEmail("")).toBe(false);
  });
});

describe("Sitzungstoken", () => {
  it("speichert nur den Hash, nie das Token", () => {
    const { token, tokenHash } = issueSession();
    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toHaveLength(64);
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("erzeugt bei jedem Aufruf ein anderes Token", () => {
    expect(issueSession().token).not.toBe(issueSession().token);
  });

  it("läuft in der Zukunft ab", () => {
    expect(new Date(issueSession().expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("Anmeldeversuche", () => {
  const key = "test-schluessel";

  beforeEach(() => clearAttempts(key));

  it("erlaubt die ersten Versuche und bremst danach", () => {
    for (let i = 0; i < 8; i++) expect(allowAttempt(key)).toBe(true);
    expect(allowAttempt(key)).toBe(false);
  });

  it("setzt den Zähler nach erfolgreicher Anmeldung zurück", () => {
    for (let i = 0; i < 8; i++) allowAttempt(key);
    clearAttempts(key);
    expect(allowAttempt(key)).toBe(true);
  });

  it("setzt den Zähler nach Ablauf des Zeitfensters zurück", () => {
    const start = Date.now();
    for (let i = 0; i < 9; i++) allowAttempt(key, start);
    expect(allowAttempt(key, start + 16 * 60_000)).toBe(true);
  });
});

describe("Cookies", () => {
  it("liest mehrere Cookies", () => {
    const parsed = parseCookies("a=1; atlas_session=abc%3D; b=2");
    expect(parsed.atlas_session).toBe("abc=");
    expect(parsed.a).toBe("1");
  });

  it("kommt mit fehlendem Header zurecht", () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it("setzt HttpOnly und SameSite", () => {
    const cookie = sessionCookie("tok", new Date(Date.now() + 1000).toISOString(), false);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("setzt Secure, wenn hinter HTTPS betrieben", () => {
    expect(sessionCookie("tok", new Date().toISOString(), true)).toContain("Secure");
  });

  it("löscht das Cookie beim Abmelden", () => {
    expect(clearCookie()).toContain("Max-Age=0");
  });
});

describe("Konten und Mandantentrennung", () => {
  let dir: string;
  const cafe = getPlaybook("founding.gastronomy.cafe")!;

  function makeUser(email: string): User {
    return {
      id: newUserId(),
      email,
      displayName: email.split("@")[0]!,
      passwordHash: hashPassword("blauer-kaffee-montag"),
      createdAt: new Date().toISOString(),
      consents: [{ key: "processing", version: "1.0", grantedAt: new Date().toISOString() }],
    };
  }

  function makeGoal(userId: string) {
    return createGoal({
      userId,
      input,
      classification: {
        domain: "founding",
        intentKey: cafe.intentKey,
        confidence: 0.5,
        region: "SN",
        feasibility: "plausible",
        missingInfo: [],
        safetyFlag: null,
      },
      plan: schedulePlan(planFromPlaybook(cafe, input), input, new Date("2026-01-05")),
      demo: true,
      costEur: 0,
    });
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "atlas-auth-"));
    process.env.ATLAS_DATA = join(dir, "atlas.json");
  });

  afterEach(() => {
    delete process.env.ATLAS_DATA;
    rmSync(dir, { recursive: true, force: true });
  });

  it("legt ein Konto an und findet es über die E-Mail", () => {
    const user = createUser(makeUser("maja@beispiel.de"));
    expect(findUserByEmail("maja@beispiel.de")?.id).toBe(user.id);
  });

  it("lässt dieselbe E-Mail-Adresse kein zweites Mal zu", () => {
    createUser(makeUser("maja@beispiel.de"));
    expect(() => createUser(makeUser("maja@beispiel.de"))).toThrow(/bereits registriert/);
  });

  it("erkennt eine gültige Sitzung", () => {
    const user = createUser(makeUser("maja@beispiel.de"));
    const { token, tokenHash, expiresAt } = issueSession();
    createSession({ tokenHash, userId: user.id, createdAt: new Date().toISOString(), expiresAt });

    expect(userForToken(hashToken(token))?.id).toBe(user.id);
  });

  it("weist eine abgelaufene Sitzung zurück", () => {
    const user = createUser(makeUser("maja@beispiel.de"));
    const { token, tokenHash } = issueSession();
    createSession({
      tokenHash,
      userId: user.id,
      createdAt: new Date(Date.now() - 2000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    expect(userForToken(hashToken(token))).toBeUndefined();
  });

  it("beendet die Sitzung beim Abmelden", () => {
    const user = createUser(makeUser("maja@beispiel.de"));
    const { token, tokenHash, expiresAt } = issueSession();
    createSession({ tokenHash, userId: user.id, createdAt: new Date().toISOString(), expiresAt });

    deleteSession(hashToken(token));
    expect(userForToken(hashToken(token))).toBeUndefined();
  });

  it("zeigt jedem Konto nur die eigenen Ziele", () => {
    const maja = createUser(makeUser("maja@beispiel.de"));
    const kai = createUser(makeUser("kai@beispiel.de"));
    makeGoal(maja.id);
    makeGoal(kai.id);
    makeGoal(kai.id);

    expect(listGoals(maja.id)).toHaveLength(1);
    expect(listGoals(kai.id)).toHaveLength(2);
  });

  it("verweigert den Zugriff auf ein fremdes Ziel", () => {
    const maja = createUser(makeUser("maja@beispiel.de"));
    const kai = createUser(makeUser("kai@beispiel.de"));
    const majasGoal = makeGoal(maja.id);

    expect(getGoal(kai.id, majasGoal.id)).toBeUndefined();
    expect(getGoal(maja.id, majasGoal.id)?.id).toBe(majasGoal.id);
  });

  it("lässt ein fremdes Ziel weder ändern noch löschen", () => {
    const maja = createUser(makeUser("maja@beispiel.de"));
    const kai = createUser(makeUser("kai@beispiel.de"));
    const majasGoal = makeGoal(maja.id);
    const first = majasGoal.plan.milestones[0]!;
    const key = `${first.ref}::${first.tasks[0]!.title}`;

    expect(setTaskStatus(kai.id, majasGoal.id, key, "done")).toBeUndefined();
    expect(deleteGoal(kai.id, majasGoal.id)).toBe(false);
    expect(getGoal(maja.id, majasGoal.id)?.taskStatus[key]).toBeUndefined();
  });

  it("exportiert alle Daten ohne den Passwort-Hash", () => {
    const maja = createUser(makeUser("maja@beispiel.de"));
    makeGoal(maja.id);

    const dump = exportUserData(maja.id)!;
    expect(dump.goals).toHaveLength(1);
    expect(JSON.stringify(dump)).not.toContain("scrypt$");
    expect(dump.account.email).toBe("maja@beispiel.de");
  });

  it("löscht mit dem Konto auch Ziele und Sitzungen", () => {
    const maja = createUser(makeUser("maja@beispiel.de"));
    const kai = createUser(makeUser("kai@beispiel.de"));
    makeGoal(maja.id);
    makeGoal(kai.id);

    const { token, tokenHash, expiresAt } = issueSession();
    createSession({ tokenHash, userId: maja.id, createdAt: new Date().toISOString(), expiresAt });

    expect(deleteUser(maja.id)).toBe(true);
    expect(findUserByEmail("maja@beispiel.de")).toBeUndefined();
    expect(listGoals(maja.id)).toHaveLength(0);
    expect(userForToken(hashToken(token))).toBeUndefined();
    // Das Konto der anderen Person bleibt unberührt.
    expect(listGoals(kai.id)).toHaveLength(1);
  });
});
