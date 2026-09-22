"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getHorseBySlug,
  insertCorrection,
  insertHorse,
  queryHorses,
} from "@/lib/db";
import { validateSubmission } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeName } from "@/lib/slug";
import type {
  ContactState,
  CorrectionState,
  SubmitState,
} from "@/lib/form-state";

async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unbekannt";
}

/* ------------------------------------------------------------------ */
/* Hengst eintragen                                                    */
/* ------------------------------------------------------------------ */

export async function submitHorseAction(
  _prev: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  const limit = rateLimit(`submit:${await clientKey()}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return {
      status: "error",
      errors: {
        _form:
          "Es wurden gerade sehr viele Einsendungen von diesem Anschluss gemacht. Bitte versuche es in einer Stunde noch einmal.",
      },
      values: {},
    };
  }

  const result = validateSubmission(form);

  if (!result.ok || !result.horse) {
    return { status: "error", errors: result.errors, values: result.values };
  }

  // Dublettenwarnung: gleicher Name plus gleiches Geburtsjahr gibt es meistens
  // nur einmal. Der Eintrag wird nicht blockiert, aber der Moderation gemeldet.
  const existing = queryHorses({ search: result.horse.name, limit: 5 });
  const duplicate = existing.horses.find(
    (h) =>
      normalizeName(h.name) === normalizeName(result.horse!.name) &&
      (result.horse!.yearOfBirth === null ||
        h.yearOfBirth === result.horse!.yearOfBirth),
  );

  insertHorse({
    ...result.horse,
    adminNote: duplicate
      ? `Möglicher Doppeleintrag zu „${duplicate.name}" (/hengste/${duplicate.slug}).`
      : null,
  });

  revalidatePath("/hengste");
  redirect("/eintragen/danke");
}

/* ------------------------------------------------------------------ */
/* Kontaktadresse anzeigen                                             */
/* ------------------------------------------------------------------ */

/**
 * Gibt die hinterlegte E-Mail-Adresse erst auf Klick heraus. Dadurch steht sie
 * nicht im ausgelieferten HTML und wird von Adress-Sammlern nicht mitgelesen.
 */
export async function revealContactAction(
  _prev: ContactState,
  form: FormData,
): Promise<ContactState> {
  const slug = String(form.get("slug") ?? "");

  const limit = rateLimit(`contact:${await clientKey()}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return {
      status: "error",
      message:
        "Zu viele Abrufe in kurzer Zeit. Bitte versuche es später noch einmal.",
    };
  }

  const horse = getHorseBySlug(slug);

  if (!horse || horse.status !== "approved") {
    return { status: "error", message: "Dieser Eintrag wurde nicht gefunden." };
  }

  if (!horse.contactEmail) {
    return {
      status: "error",
      message: "Zu diesem Pferd ist keine Kontaktadresse hinterlegt.",
    };
  }

  return { status: "revealed", email: horse.contactEmail };
}

/* ------------------------------------------------------------------ */
/* Korrektur melden                                                    */
/* ------------------------------------------------------------------ */

export async function reportCorrectionAction(
  _prev: CorrectionState,
  form: FormData,
): Promise<CorrectionState> {
  const limit = rateLimit(`correction:${await clientKey()}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Zu viele Meldungen in kurzer Zeit. Bitte später erneut versuchen.",
    };
  }

  // Honeypot
  if (String(form.get("website") ?? "")) {
    return { status: "sent" };
  }

  const slug = String(form.get("slug") ?? "");
  const message = String(form.get("message") ?? "").trim();
  const email = String(form.get("reporterEmail") ?? "").trim();

  if (message.length < 10) {
    return {
      status: "error",
      message: "Bitte beschreibe kurz, was nicht stimmt (mindestens 10 Zeichen).",
    };
  }

  const horse = getHorseBySlug(slug);
  if (!horse) {
    return { status: "error", message: "Dieser Eintrag wurde nicht gefunden." };
  }

  insertCorrection(horse.id, message.slice(0, 2000), email.slice(0, 120) || null);

  return { status: "sent" };
}
