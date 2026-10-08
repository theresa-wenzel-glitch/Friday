"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  addNachtrag,
  createBaustelle,
  createBetrieb,
  deleteEntwurf,
  erneuereZugangscode,
  findBetriebByCode,
  getBetrieb,
  getEintrag,
  loescheMediumDateien,
  schliesseAb,
  setBaustelleAktiv,
  updateBetriebName,
  updateEntwurf,
} from "@/lib/bautagebuch/db";
import { berechneHash } from "@/lib/bautagebuch/erfassung";
import type { FormZustand } from "@/lib/bautagebuch/form-state";
import { abmelden, anmelden, aktuelleSitzung, brauchtSitzung } from "@/lib/bautagebuch/sitzung";
import { FELDER, type EintragDaten } from "@/lib/bautagebuch/types";
import { sucheOrt } from "@/lib/bautagebuch/wetter";
import { rateLimit } from "@/lib/rate-limit";

function feld(form: FormData, name: string, max = 200): string {
  return String(form.get(name) ?? "").trim().slice(0, max);
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
}

/* ---------------- Konto ---------------- */

export async function registrierenAction(_prev: FormZustand, form: FormData): Promise<FormZustand> {
  const werte = {
    name: feld(form, "name", 120),
    inhaber: feld(form, "inhaber", 80),
    email: feld(form, "email", 160),
  };
  if (werte.name.length < 2) return { fehler: "Bitte den Namen des Betriebs angeben.", werte };
  if (werte.inhaber.length < 2) return { fehler: "Bitte Ihren Namen angeben.", werte };
  if (werte.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(werte.email)) {
    return { fehler: "Die E-Mail-Adresse sieht nicht richtig aus.", werte };
  }

  const limit = rateLimit(`btb-registrieren:${await clientIp()}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return { fehler: "Zu viele neue Konten von diesem Anschluss.", werte };

  const betrieb = createBetrieb({
    name: werte.name,
    inhaber: werte.inhaber,
    email: werte.email || null,
  });
  await anmelden(betrieb, werte.inhaber);
  redirect("/bautagebuch/app/team?neu=1");
}

export async function loginAction(_prev: FormZustand, form: FormData): Promise<FormZustand> {
  const werte = { code: feld(form, "code", 40), person: feld(form, "person", 80) };
  if (werte.person.length < 2) return { fehler: "Bitte Ihren Namen angeben.", werte };

  // Bremst das Durchprobieren von Codes aus.
  const limit = rateLimit(`btb-login:${await clientIp()}`, 15, 15 * 60 * 1000);
  if (!limit.allowed) {
    return {
      fehler: `Zu viele Versuche. Bitte in ${Math.ceil(limit.retryAfterMs / 60000)} Minuten erneut.`,
      werte,
    };
  }

  const betrieb = findBetriebByCode(werte.code);
  if (!betrieb) return { fehler: "Diesen Zugangscode gibt es nicht.", werte };

  await anmelden(betrieb, werte.person);
  redirect("/bautagebuch/app");
}

export async function logoutAction() {
  await abmelden();
  redirect("/bautagebuch");
}

export async function codeErneuernAction() {
  const s = await brauchtSitzung();
  erneuereZugangscode(s.betrieb.id);
  // Die eigene Anmeldung gleich mit erneuern, alle anderen sind jetzt abgemeldet.
  await anmelden(getBetrieb(s.betrieb.id)!, s.person);
  revalidatePath("/bautagebuch/app/team");
}

export async function betriebNameAction(_prev: FormZustand, form: FormData): Promise<FormZustand> {
  const s = await brauchtSitzung();
  const name = feld(form, "name", 120);
  if (name.length < 2) return { fehler: "Bitte einen Namen angeben." };
  updateBetriebName(s.betrieb.id, name);
  revalidatePath("/bautagebuch/app", "layout");
  return { ok: "Gespeichert." };
}

/* ---------------- Baustellen ---------------- */

export async function baustelleAnlegenAction(_prev: FormZustand, form: FormData): Promise<FormZustand> {
  const s = await brauchtSitzung();
  const werte = {
    name: feld(form, "name", 120),
    adresse: feld(form, "adresse", 200),
    ort: feld(form, "ort", 120),
    auftraggeber: feld(form, "auftraggeber", 160),
  };
  if (werte.name.length < 2) {
    return { fehler: "Bitte einen Namen für die Baustelle angeben (z. B. „EFH Müller“).", werte };
  }

  // Koordinaten für den Wetterabruf. Klappt das nicht, kommt das Wetter später vom Handy-GPS.
  const lage = werte.ort ? await sucheOrt(werte.ort) : null;
  createBaustelle({
    betriebId: s.betrieb.id,
    name: werte.name,
    adresse: werte.adresse || null,
    ort: werte.ort || null,
    auftraggeber: werte.auftraggeber || null,
    lat: lage?.lat ?? null,
    lon: lage?.lon ?? null,
  });
  revalidatePath("/bautagebuch/app", "layout");
  return {
    ok: lage || !werte.ort
      ? `Baustelle „${werte.name}“ angelegt.`
      : `Baustelle „${werte.name}“ angelegt. Den Ort konnten wir nicht finden - das Wetter kommt dann vom Handy-Standort.`,
  };
}

export async function baustelleAktivAction(form: FormData) {
  const s = await brauchtSitzung();
  setBaustelleAktiv(s.betrieb.id, Number(form.get("id")), form.get("aktiv") === "1");
  revalidatePath("/bautagebuch/app", "layout");
}

/* ---------------- Einträge ---------------- */

/** Übernimmt die Felder aus dem Formular in den Entwurf. Gibt eine Fehlermeldung oder null zurück. */
function speichereEntwurf(betriebId: number, form: FormData): string | null {
  const id = Number(form.get("id"));
  const eintrag = getEintrag(betriebId, id);
  if (!eintrag) return "Eintrag nicht gefunden.";
  if (eintrag.status !== "entwurf") return "Abgeschlossene Einträge sind nicht mehr änderbar.";

  const datum = feld(form, "datum", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return "Bitte ein gültiges Datum angeben.";

  const daten: EintragDaten = { ...eintrag.daten };
  for (const f of FELDER) daten[f.key] = feld(form, f.key, 4000);
  // Was jetzt ausgefüllt ist, fehlt nicht mehr.
  const zuFeld: Record<string, keyof EintragDaten> = {
    Anwesende: "anwesende",
    Arbeitszeit: "arbeitszeit",
    "Ausgeführte Leistungen": "leistungen",
    Material: "material",
    Behinderungen: "behinderungen",
  };
  daten.fehlend = daten.fehlend.filter((f) => !zuFeld[f] || !String(daten[zuFeld[f]]).trim());

  updateEntwurf(betriebId, id, { datum, daten });
  return null;
}

export async function entwurfSpeichernAction(_prev: FormZustand, form: FormData): Promise<FormZustand> {
  const s = await brauchtSitzung();
  const fehler = speichereEntwurf(s.betrieb.id, form);
  if (fehler) return { fehler };
  revalidatePath(`/bautagebuch/app/eintrag/${Number(form.get("id"))}`);
  return { ok: "Gespeichert." };
}

/** Speichert die letzten Änderungen und schreibt den Eintrag fest. */
export async function abschliessenAction(_prev: FormZustand, form: FormData): Promise<FormZustand> {
  const s = await brauchtSitzung();
  const id = Number(form.get("id"));
  const fehler = speichereEntwurf(s.betrieb.id, form);
  if (fehler) return { fehler };
  if (!schliesseAb(s.betrieb.id, id, s.person, berechneHash)) {
    return { fehler: "Der Eintrag konnte nicht abgeschlossen werden." };
  }
  revalidatePath("/bautagebuch/app", "layout");
  redirect(`/bautagebuch/app/eintrag/${id}?abgeschlossen=1`);
}

export async function entwurfLoeschenAction(form: FormData) {
  const s = await brauchtSitzung();
  const medien = deleteEntwurf(s.betrieb.id, Number(form.get("id")));
  loescheMediumDateien(medien);
  revalidatePath("/bautagebuch/app", "layout");
  redirect("/bautagebuch/app");
}

export async function nachtragAction(_prev: FormZustand, form: FormData): Promise<FormZustand> {
  const s = await aktuelleSitzung();
  if (!s) return { fehler: "Bitte neu anmelden." };
  const id = Number(form.get("id"));
  const eintrag = getEintrag(s.betrieb.id, id);
  if (!eintrag || eintrag.status !== "abgeschlossen") return { fehler: "Eintrag nicht gefunden." };
  const text = feld(form, "text", 2000);
  if (text.length < 3) return { fehler: "Bitte den Nachtrag eingeben." };
  addNachtrag(id, text, s.person);
  revalidatePath(`/bautagebuch/app/eintrag/${id}`);
  return { ok: "Nachtrag gespeichert." };
}
