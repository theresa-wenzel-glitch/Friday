import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../src/http/errors.js";
import { Router } from "../src/http/router.js";
import { RateLimiter } from "../src/http/rate-limit.js";

const noop = async () => null;

describe("Router", () => {
  it("findet eine einfache Route", () => {
    const router = new Router().get("/health", noop);
    assert.notEqual(router.match("GET", "/health"), null);
  });

  it("liest Pfadparameter aus", () => {
    const router = new Router().get("/requests/:id/questions/:questionId", noop);
    const match = router.match("GET", "/requests/abc/questions/xyz");
    assert.deepEqual(match?.params, { id: "abc", questionId: "xyz" });
  });

  it("dekodiert Prozentzeichen in Parametern", () => {
    const router = new Router().get("/x/:value", noop);
    assert.equal(router.match("GET", "/x/a%2Fb")?.params["value"], "a/b");
  });

  it("liefert null für einen unbekannten Pfad", () => {
    const router = new Router().get("/health", noop);
    assert.equal(router.match("GET", "/gibt-es-nicht"), null);
  });

  it("unterscheidet unbekannten Pfad von falscher Methode", () => {
    const router = new Router().get("/requests", noop);
    assert.throws(
      () => router.match("DELETE", "/requests"),
      (error: unknown) => error instanceof ApiError && error.status === 405,
    );
  });

  it("hängt Module unter einem Präfix ein", () => {
    const inner = new Router().get("/:id", noop);
    const router = new Router().mount("/requests", inner);
    assert.equal(router.match("GET", "/requests/123")?.params["id"], "123");
  });

  it("unterscheidet Pfade unterschiedlicher Länge", () => {
    const router = new Router().get("/businesses/me", noop).get("/businesses/:id", noop);
    assert.deepEqual(router.match("GET", "/businesses/me")?.params, {});
    assert.equal(router.match("GET", "/businesses/abc")?.params["id"], "abc");
  });

  it("bevorzugt die zuerst eingetragene Route bei gleichem Muster", () => {
    // "/businesses/me" ist vor "/businesses/:id" eingetragen und gewinnt
    // deshalb - sonst würde "me" als Unternehmens-ID gelesen.
    const seen: string[] = [];
    const router = new Router()
      .get("/businesses/me", async () => {
        seen.push("me");
        return null;
      })
      .get("/businesses/:id", async () => {
        seen.push("id");
        return null;
      });
    const match = router.match("GET", "/businesses/me");
    assert.notEqual(match, null);
    void match?.handler({} as never);
    assert.deepEqual(seen, ["me"]);
  });
});

describe("Rate Limiting", () => {
  it("lässt Anfragen bis zur Grenze durch", () => {
    const limiter = new RateLimiter();
    const rule = { limit: 3, windowMs: 1000 };
    assert.equal(limiter.check("a", rule, 0), true);
    assert.equal(limiter.check("a", rule, 0), true);
    assert.equal(limiter.check("a", rule, 0), true);
    assert.equal(limiter.check("a", rule, 0), false);
  });

  it("zählt Schluessel getrennt", () => {
    const limiter = new RateLimiter();
    const rule = { limit: 1, windowMs: 1000 };
    assert.equal(limiter.check("a", rule, 0), true);
    assert.equal(limiter.check("b", rule, 0), true);
    assert.equal(limiter.check("a", rule, 0), false);
  });

  it("gibt das Kontingent nach Ablauf des Fensters frei", () => {
    const limiter = new RateLimiter();
    const rule = { limit: 1, windowMs: 1000 };
    assert.equal(limiter.check("a", rule, 0), true);
    assert.equal(limiter.check("a", rule, 500), false);
    assert.equal(limiter.check("a", rule, 1001), true);
  });

  it("nennt eine Wartezeit von mindestens einer Sekunde", () => {
    const limiter = new RateLimiter();
    limiter.check("a", { limit: 1, windowMs: 5000 }, 0);
    assert.ok(limiter.retryAfterSeconds("a", 0) >= 1);
  });
});
