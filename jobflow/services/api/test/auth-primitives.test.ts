import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "../src/modules/auth/password.js";
import { bearerToken, createToken, hashToken, tokensMatch } from "../src/modules/auth/tokens.js";
import { ipPrefix } from "../src/lib/net.js";

describe("Passwort-Hashing", () => {
  it("erkennt das richtige Passwort", async () => {
    const hash = await hashPassword("ein-langes-passwort");
    assert.equal(await verifyPassword("ein-langes-passwort", hash), true);
  });

  it("weist ein falsches Passwort zurück", async () => {
    const hash = await hashPassword("ein-langes-passwort");
    assert.equal(await verifyPassword("ein-anderes-passwort", hash), false);
  });

  it("erzeugt für dasselbe Passwort unterschiedliche Hashes", async () => {
    // Ohne zufälliges Salt wären gleiche Passwörter in der Datenbank
    // aneinander erkennbar.
    const a = await hashPassword("ein-langes-passwort");
    const b = await hashPassword("ein-langes-passwort");
    assert.notEqual(a, b);
  });

  it("enthält das Klartextpasswort nicht", async () => {
    const hash = await hashPassword("ein-langes-passwort");
    assert.ok(!hash.includes("ein-langes-passwort"));
  });

  it("behandelt gleichwertige Unicode-Schreibweisen gleich", async () => {
    // "ä" lässt sich als ein Zeichen oder als a + Kombinationszeichen
    // eingeben. Für den Nutzer ist es dasselbe Passwort.
    const composed = "paßwort-ähnlich";
    const decomposed = "paßwort-ähnlich";
    const hash = await hashPassword(composed);
    assert.equal(await verifyPassword(decomposed, hash), true);
  });

  it("stürzt bei einem unbrauchbaren gespeicherten Hash nicht ab", async () => {
    for (const broken of ["", "unsinn", "scrypt$a$b$c$d$e", "argon2$1$2$3$x$y"]) {
      assert.equal(await verifyPassword("egal", broken), false);
    }
  });
});

describe("Session-Token", () => {
  it("erzeugt jedes Mal ein anderes Token", () => {
    assert.notEqual(createToken(), createToken());
  });

  it("bildet dasselbe Token stabil auf denselben Hash ab", () => {
    const token = createToken();
    assert.equal(hashToken(token, "geheim"), hashToken(token, "geheim"));
  });

  it("liefert mit einem anderen Geheimnis einen anderen Hash", () => {
    const token = createToken();
    assert.notEqual(hashToken(token, "geheim-a"), hashToken(token, "geheim-b"));
  });

  it("vergleicht Hashes zeitkonstant und korrekt", () => {
    const a = hashToken("token-a", "geheim");
    const b = hashToken("token-b", "geheim");
    assert.equal(tokensMatch(a, a), true);
    assert.equal(tokensMatch(a, b), false);
  });

  it("liest das Bearer-Token aus dem Header", () => {
    assert.equal(bearerToken("Bearer abc123"), "abc123");
    assert.equal(bearerToken("bearer abc123"), "abc123");
    assert.equal(bearerToken("Basic abc123"), null);
    assert.equal(bearerToken(undefined), null);
    assert.equal(bearerToken("Bearer"), null);
  });
});

describe("IP-Kürzung", () => {
  it("kürzt IPv4 auf /24", () => {
    assert.equal(ipPrefix("192.168.10.42"), "192.168.10.0/24");
  });

  it("behandelt IPv4-in-IPv6 wie IPv4", () => {
    assert.equal(ipPrefix("::ffff:192.168.10.42"), "192.168.10.0/24");
  });

  it("kürzt IPv6 auf /48", () => {
    assert.equal(ipPrefix("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), "2001:0db8:85a3::/48");
  });

  it("kommt mit fehlender Adresse zurecht", () => {
    assert.equal(ipPrefix(undefined), "unbekannt");
  });
});
