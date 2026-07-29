import { z } from "zod";
import { COUNTRIES } from "./countries";

/** Leere Formularfelder werden zu null, nicht zu "" oder 0. */
const optionalText = (max: number) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    },
    z.string().max(max).nullable(),
  );

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return v ?? null;
      const trimmed = v.trim();
      if (trimmed === "") return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : NaN;
    },
    z.number().int().min(min).max(max).nullable(),
  );

const optionalUrl = z.preprocess(
  (v) => {
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  },
  z
    .string()
    .regex(/^https?:\/\/\S+$/i, "Bitte eine vollständige Adresse mit https:// angeben.")
    .nullable(),
);

/** HTML-Checkboxen senden "on", wenn sie angehakt sind – sonst gar nichts. */
const checkbox = z.preprocess(
  (v) => v === "on" || v === "true" || v === true,
  z.boolean(),
);

const requiredText = (min: number, max: number, message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(min, message).max(max),
  );

const email = (message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.email(message).max(200),
  );

export const registerSchema = z.object({
  name: requiredText(2, 120, "Bitte den Namen angeben."),
  email: email("Bitte eine gültige E-Mail-Adresse angeben."),
  password: z.string().min(8, "Das Passwort braucht mindestens 8 Zeichen.").max(200),
  farm: optionalText(120),
  phone: optionalText(60),
  country: z.preprocess(
    (v) => (typeof v === "string" && v in COUNTRIES ? v : null),
    z.string().nullable(),
  ),
});

export const loginSchema = z.object({
  email: email("Bitte eine gültige E-Mail-Adresse angeben."),
  password: z.string().min(1, "Bitte das Passwort eingeben."),
});

const currentYear = new Date().getFullYear();

export const stallionSchema = z.object({
  name: requiredText(2, 120, "Bitte den Namen des Hengstes angeben."),
  barnName: optionalText(80),
  breed: requiredText(2, 60, "Bitte die Rasse angeben."),
  registry: optionalText(40),
  registrationNo: optionalText(60),
  yearOfBirth: optionalInt(1950, currentYear),
  color: optionalText(60),
  heightCm: optionalInt(120, 190),
  discipline: requiredText(2, 60, "Bitte die Disziplin angeben."),

  sireName: optionalText(120),
  sireSireName: optionalText(120),
  sireDamName: optionalText(120),
  damName: optionalText(120),
  damSireName: optionalText(120),
  damDamName: optionalText(120),
  allBreedUrl: optionalUrl,

  earnings: optionalText(160),
  achievements: optionalText(4000),
  description: optionalText(6000),
  offspring: optionalText(4000),

  panelHypp: optionalText(20),
  panelHerda: optionalText(20),
  panelGbed: optionalText(20),
  panelPssm1: optionalText(20),
  panelMh: optionalText(20),
  panelIma: optionalText(20),

  standingAt: optionalText(160),
  city: optionalText(120),
  country: z.string().refine((v) => v in COUNTRIES, "Bitte ein Land auswählen."),

  studFee: optionalInt(0, 1_000_000),
  currency: z.enum(["EUR", "USD", "CHF", "GBP"]),
  feeOnRequest: checkbox,
  frozenSemen: checkbox,
  shippedSemen: checkbox,
  liveCover: checkbox,
  availableInEu: checkbox,
  availableInUs: checkbox,

  contactName: optionalText(120),
  contactEmail: email("Bitte eine gültige Kontakt-E-Mail angeben."),
  contactPhone: optionalText(60),
  website: optionalUrl,

  published: checkbox,
});

export const inquirySchema = z.object({
  stallionId: z.string().min(1),
  fromName: requiredText(2, 120, "Bitte den Namen angeben."),
  fromEmail: email("Bitte eine gültige E-Mail-Adresse angeben."),
  message: requiredText(
    10,
    4000,
    "Bitte eine kurze Nachricht schreiben (mindestens 10 Zeichen).",
  ),
});

export const photoUrlSchema = z.object({
  stallionId: z.string().min(1),
  externalUrl: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string()
      .regex(/^https?:\/\/\S+$/i, "Bitte einen vollständigen Bild-Link mit https:// angeben."),
  ),
  caption: optionalText(160),
});

export type StallionInput = z.infer<typeof stallionSchema>;

/** Erste Fehlermeldung aus einem Zod-Ergebnis, fuer die Anzeige im Formular. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Bitte die Eingaben prüfen.";
}
