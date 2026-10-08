import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBetrieb } from "./db";
import type { Betrieb } from "./types";

/*
 * Anmeldung per Zugangscode. Jeder Betrieb hat einen Code, den der Chef an
 * seine Leute weitergibt. Wer sich anmeldet, gibt dazu seinen Namen an - der
 * steht dann als "erfasst von" in jedem Eintrag.
 *
 * Das Cookie enthält Betrieb, Name und eine Versionsnummer. Erzeugt der Chef
 * einen neuen Code, steigt die Version und alle alten Anmeldungen verfallen.
 */

const COOKIE = "btb_sitzung";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 Tage - auf der Baustelle will sich niemand ständig neu anmelden

let devSecret: string | null = null;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value && value !== "bitte-aendern") return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET ist nicht gesetzt (siehe .env.example).");
  }
  // Zum Ausprobieren auf dem eigenen Rechner: zufälliges Geheimnis pro Start.
  // Nach einem Neustart muss man sich dann neu anmelden.
  devSecret ??= crypto.randomBytes(32).toString("hex");
  return devSecret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

interface Payload {
  b: number;
  p: string;
  v: number;
  exp: number;
}

export interface Sitzung {
  betrieb: Betrieb;
  person: string;
}

export async function anmelden(betrieb: Betrieb, person: string) {
  const payload: Payload = {
    b: betrieb.id,
    p: person,
    v: betrieb.sitzungVersion,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const store = await cookies();
  store.set(COOKIE, `${data}.${sign(data)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function abmelden() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function aktuelleSitzung(): Promise<Sitzung | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return null;
  }

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (!(payload.exp > Date.now())) return null;

  const betrieb = getBetrieb(payload.b);
  if (!betrieb || betrieb.sitzungVersion !== payload.v) return null;

  return { betrieb, person: payload.p };
}

/** Für Seiten: leitet zur Anmeldung um, wenn niemand angemeldet ist. */
export async function brauchtSitzung(): Promise<Sitzung> {
  const s = await aktuelleSitzung();
  if (!s) redirect("/bautagebuch/login");
  return s;
}
