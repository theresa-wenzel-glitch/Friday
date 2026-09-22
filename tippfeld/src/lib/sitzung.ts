import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

/*
 * Sitzungen.
 *
 * Bewusst einfach gehalten: ein signiertes Cookie verweist auf einen Nutzer in
 * der Datenbank. Für einen Testbetrieb reicht das, für eine Veröffentlichung
 * gehört hier eine richtige Anmeldung mit Passwort oder Anbieter-Login hin
 * (siehe README, Abschnitt "Was noch fehlt").
 *
 * Wichtig ist der Teil, der auch jetzt schon trägt: Die Kennung kommt aus einem
 * signierten Cookie, nicht aus einem Formularfeld. Ein Browser kann sich damit
 * nicht als jemand anderes ausgeben.
 */

const NUTZER_COOKIE = "tf_nutzer";
const ADMIN_COOKIE = "tf_admin";

function geheimnis(): string {
  const wert = process.env.SITZUNG_GEHEIMNIS;
  if (!wert || wert.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SITZUNG_GEHEIMNIS fehlt oder ist zu kurz.");
    }
    return "nur-fuer-die-entwicklung-nicht-veroeffentlichen";
  }
  return wert;
}

function signieren(wert: string): string {
  return createHmac("sha256", geheimnis()).update(wert).digest("base64url");
}

function pruefen(wert: string, signatur: string): boolean {
  const erwartet = Buffer.from(signieren(wert));
  const gegeben = Buffer.from(signatur);
  return erwartet.length === gegeben.length && timingSafeEqual(erwartet, gegeben);
}

export interface Nutzer {
  id: number;
  name: string;
  zeichen: string;
  rolle: string;
  sprache: string;
  thema: string;
  hinweise: number;
  erstellt: string;
}

export async function aktuellerNutzer(): Promise<Nutzer | null> {
  const topf = await cookies();
  const roh = topf.get(NUTZER_COOKIE)?.value;
  if (!roh) return null;
  const [kennung, signatur] = roh.split(".");
  if (!kennung || !signatur || !pruefen(kennung, signatur)) return null;
  const nutzer = db().prepare("SELECT * FROM nutzer WHERE id = ?").get(Number(kennung)) as
    | Nutzer
    | undefined;
  return nutzer ?? null;
}

/** Für Seiten, die ohne Anmeldung keinen Sinn ergeben. */
export async function nutzerErforderlich(): Promise<Nutzer> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) redirect("/anmelden");
  return nutzer;
}

export async function sitzungSetzen(nutzerId: number): Promise<void> {
  const topf = await cookies();
  const kennung = String(nutzerId);
  topf.set(NUTZER_COOKIE, `${kennung}.${signieren(kennung)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function sitzungBeenden(): Promise<void> {
  const topf = await cookies();
  topf.delete(NUTZER_COOKIE);
  topf.delete(ADMIN_COOKIE);
}

/* --- Adminbereich -------------------------------------------------------- */

export async function istAdmin(): Promise<boolean> {
  const topf = await cookies();
  const roh = topf.get(ADMIN_COOKIE)?.value;
  return Boolean(roh && pruefen("admin", roh));
}

export async function adminErforderlich(): Promise<void> {
  if (!(await istAdmin())) redirect("/admin/anmelden");
}

export async function adminAnmelden(passwort: string): Promise<boolean> {
  const erwartet = process.env.ADMIN_PASSWORT;
  if (!erwartet) return false;
  const a = Buffer.from(passwort);
  const b = Buffer.from(erwartet);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const topf = await cookies();
  topf.set(ADMIN_COOKIE, signieren("admin"), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return true;
}
