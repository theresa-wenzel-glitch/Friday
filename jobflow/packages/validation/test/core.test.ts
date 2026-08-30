import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  array,
  email,
  isoDateTime,
  nullable,
  number,
  object,
  oneOf,
  optional,
  string,
  uuid,
  validate,
  withDefault,
} from "../src/index.js";

describe("string", () => {
  it("entfernt Leerzeichen am Rand", () => {
    const result = validate(string(), "  Hallo  ");
    assert.deepEqual(result, { ok: true, value: "Hallo" });
  });

  it("weist einen Text zurueck, der nur aus Leerzeichen besteht", () => {
    const result = validate(string(), "   ");
    assert.equal(result.ok, false);
  });

  it("achtet auf Mindest- und Hoechstlaenge", () => {
    assert.equal(validate(string({ min: 5 }), "abc").ok, false);
    assert.equal(validate(string({ max: 3 }), "abcd").ok, false);
  });
});

describe("email", () => {
  it("normalisiert auf Kleinbuchstaben", () => {
    const result = validate(email(), "  Max.Mustermann@Example.TEST ");
    assert.deepEqual(result, { ok: true, value: "max.mustermann@example.test" });
  });

  it("weist offensichtlich ungueltige Adressen zurueck", () => {
    for (const value of ["kein-at", "a@b", "@example.test", "a b@example.test", ""]) {
      assert.equal(validate(email(), value).ok, false, `${value} sollte ungueltig sein`);
    }
  });
});

describe("optional und nullable", () => {
  it("unterscheidet fehlendes Feld von null", () => {
    const schema = object({ a: optional(string()), b: nullable(string()) });
    const result = validate(schema, { b: null });
    assert.deepEqual(result, { ok: true, value: { b: null } });
  });

  it("laesst ein optionales Feld weg, ohne einen Fehler zu melden", () => {
    const schema = object({ name: string(), phone: optional(string()) });
    const result = validate(schema, { name: "Max" });
    assert.deepEqual(result, { ok: true, value: { name: "Max" } });
  });

  it("meldet einen Fehler, wenn ein optionales Feld gesetzt, aber ungueltig ist", () => {
    const schema = object({ name: string(), phone: optional(string({ min: 5 })) });
    const result = validate(schema, { name: "Max", phone: "12" });
    assert.equal(result.ok, false);
  });
});

describe("object", () => {
  it("verwirft unbekannte Schluessel", () => {
    const schema = object({ name: string() });
    const result = validate(schema, { name: "Max", role: "ADMIN" });
    assert.deepEqual(result, { ok: true, value: { name: "Max" } });
  });

  it("meldet Fehler mit dem Pfad des Feldes", () => {
    const schema = object({ inner: object({ value: number({ min: 1 }) }) });
    const result = validate(schema, { inner: { value: 0 } });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok("inner.value" in result.fields);
  });

  it("weist einen Array als Objekt zurueck", () => {
    assert.equal(validate(object({ a: string() }), ["a"]).ok, false);
  });
});

describe("array", () => {
  it("meldet den Index des fehlerhaften Eintrags", () => {
    const result = validate(array(string({ min: 2 })), ["ok", "x"]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok("1" in result.fields);
  });

  it("achtet auf die Hoechstzahl", () => {
    assert.equal(validate(array(string(), { max: 2 }), ["a", "b", "c"]).ok, false);
  });
});

describe("weitere Bausteine", () => {
  it("oneOf laesst nur bekannte Werte zu", () => {
    const schema = oneOf(["LOW", "NORMAL", "HIGH"] as const);
    assert.deepEqual(validate(schema, "HIGH"), { ok: true, value: "HIGH" });
    assert.equal(validate(schema, "URGENT").ok, false);
  });

  it("withDefault greift bei undefined und null", () => {
    const schema = withDefault(number(), 7);
    assert.deepEqual(validate(schema, undefined), { ok: true, value: 7 });
    assert.deepEqual(validate(schema, null), { ok: true, value: 7 });
    assert.deepEqual(validate(schema, 3), { ok: true, value: 3 });
  });

  it("isoDateTime normalisiert auf UTC", () => {
    const result = validate(isoDateTime(), "2026-09-01T12:00:00+02:00");
    assert.deepEqual(result, { ok: true, value: "2026-09-01T10:00:00.000Z" });
  });

  it("uuid weist Werte ohne UUID-Form zurueck", () => {
    assert.equal(validate(uuid(), "keine-uuid").ok, false);
    assert.equal(validate(uuid(), "6f2b1e4a-9c3d-4b1f-8e2a-0d4c5b6a7e8f").ok, true);
  });

  it("number nimmt auch Zahlen als Text an - Query-Parameter kommen so an", () => {
    assert.deepEqual(validate(number({ int: true }), "42"), { ok: true, value: 42 });
    assert.equal(validate(number(), "vierzig").ok, false);
  });
});
