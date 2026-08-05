import {
  AVAILABILITIES,
  DISCIPLINES,
  GENETIC_TESTS,
  SEXES,
  type Availability,
  type GeneticTest,
  type Sex,
} from "./types";
import { isValidAllbreedUrl } from "./allbreed";
import { UPLOAD_FILENAME_RE } from "./upload-validate";
import type { HorseInput } from "./db";

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  values: Record<string, string>;
  horse?: HorseInput;
}

const MAX = {
  name: 80,
  aka: 80,
  short: 120,
  registry: 40,
  text: 4000,
  genetics: 16,
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const CURRENT_YEAR = new Date().getFullYear();

function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullIfEmpty(value: string): string | null {
  return value.length > 0 ? value : null;
}

/** Erlaubt sind nur http(s)-Adressen - verhindert javascript:- und data:-Links. */
function safeUrl(value: string): string | null {
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Ein selbst hochgeladenes Bild kommt als relativer Pfad vom eigenen
 * Upload-Endpunkt (/api/uploads/<uuid>.<ext>) - der darf nicht durch die
 * externe URL-Prüfung laufen, die sonst ein "https://" davorsetzt und den
 * Pfad kaputt macht.
 */
function isOwnUpload(value: string): boolean {
  const match = value.match(/^\/api\/uploads\/([^/?#]+)$/);
  return match !== null && UPLOAD_FILENAME_RE.test(match[1]);
}

export function validateSubmission(form: FormData): ValidationResult {
  const errors: Record<string, string> = {};
  const values: Record<string, string> = {};

  const keep = (key: string): string => {
    const value = str(form, key);
    values[key] = value;
    return value;
  };

  const name = keep("name");
  const aka = keep("aka");
  const sexRaw = keep("sex") || "stallion";
  const breed = keep("breed");
  const registryNo = keep("registryNo");
  const yearRaw = keep("yearOfBirth");
  const deathRaw = keep("yearOfDeath");
  const color = keep("color");
  const heightRaw = keep("heightCm");
  const country = keep("country").toUpperCase();
  const location = keep("location");
  const studName = keep("studName");
  const description = keep("description");
  const showRecord = keep("showRecord");
  const offspring = keep("offspring");
  const bloodlineNote = keep("bloodlineNote");
  const sireName = keep("sireName");
  const damName = keep("damName");
  const availabilityRaw = keep("availability") || "unknown";
  const photoUrl = keep("photoUrl");
  const photoCredit = keep("photoCredit");
  const videoUrl = keep("videoUrl");
  const websiteUrl = keep("websiteUrl");
  const allbreedUrl = keep("allbreedUrl");
  const ownerName = keep("ownerName");
  const contactEmail = keep("contactEmail");
  const contactPhone = keep("contactPhone");
  const submitterEmail = keep("submitterEmail");
  const consent = str(form, "consent");

  // Honeypot: ein für Menschen unsichtbares Feld. Ist es gefüllt, war es ein Bot.
  if (str(form, "website")) {
    errors._spam = "Die Einsendung wurde als automatisiert erkannt.";
  }

  if (name.length < 2) {
    errors.name = "Bitte gib den Namen des Pferdes an (mindestens 2 Zeichen).";
  } else if (name.length > MAX.name) {
    errors.name = `Der Name darf höchstens ${MAX.name} Zeichen lang sein.`;
  }

  if (aka.length > MAX.aka) errors.aka = "Der Rufname ist zu lang.";

  const sex: Sex = SEXES.includes(sexRaw as Sex) ? (sexRaw as Sex) : "stallion";

  let yearOfBirth: number | null = null;
  if (yearRaw) {
    const parsed = Number(yearRaw);
    if (!Number.isInteger(parsed) || parsed < 1850 || parsed > CURRENT_YEAR + 1) {
      errors.yearOfBirth = `Bitte ein Geburtsjahr zwischen 1850 und ${CURRENT_YEAR + 1} angeben.`;
    } else {
      yearOfBirth = parsed;
    }
  }

  let yearOfDeath: number | null = null;
  if (deathRaw) {
    const parsed = Number(deathRaw);
    if (!Number.isInteger(parsed) || parsed < 1850 || parsed > CURRENT_YEAR) {
      errors.yearOfDeath = "Bitte ein gültiges Todesjahr angeben.";
    } else if (yearOfBirth !== null && parsed < yearOfBirth) {
      errors.yearOfDeath = "Das Todesjahr kann nicht vor dem Geburtsjahr liegen.";
    } else {
      yearOfDeath = parsed;
    }
  }

  let heightCm: number | null = null;
  if (heightRaw) {
    const parsed = Number(heightRaw);
    if (!Number.isFinite(parsed) || parsed < 100 || parsed > 200) {
      errors.heightCm = "Das Stockmaß muss zwischen 100 und 200 cm liegen.";
    } else {
      heightCm = Math.round(parsed);
    }
  }

  if (country && !/^[A-Z]{2}$/.test(country)) {
    errors.country = "Bitte das Land als zweistelligen Code angeben, z. B. DE, AT, US.";
  }

  const disciplines = form
    .getAll("disciplines")
    .filter((v): v is string => typeof v === "string")
    .filter((v) => (DISCIPLINES as readonly string[]).includes(v));

  const availability: Availability = AVAILABILITIES.includes(
    availabilityRaw as Availability,
  )
    ? (availabilityRaw as Availability)
    : "unknown";

  const genetics: Partial<Record<GeneticTest, string>> = {};
  for (const test of GENETIC_TESTS) {
    const raw = str(form, `genetics.${test}`);
    values[`genetics.${test}`] = raw;
    if (raw) genetics[test] = raw.slice(0, MAX.genetics);
  }

  for (const [key, label] of [
    ["description", "Beschreibung"],
    ["showRecord", "Turniererfolge"],
    ["offspring", "Nachkommen"],
    ["bloodlineNote", "Anmerkung zur Blutlinie"],
  ] as const) {
    if (values[key] && values[key].length > MAX.text) {
      errors[key] = `${label}: bitte auf ${MAX.text} Zeichen kürzen.`;
    }
  }

  if (!contactEmail) {
    errors.contactEmail =
      "Bitte eine Kontaktadresse angeben - ohne sie kann niemand nachfragen.";
  } else if (!EMAIL_RE.test(contactEmail)) {
    errors.contactEmail = "Diese E-Mail-Adresse sieht nicht gültig aus.";
  }

  if (submitterEmail && !EMAIL_RE.test(submitterEmail)) {
    errors.submitterEmail = "Diese E-Mail-Adresse sieht nicht gültig aus.";
  }

  const photo = isOwnUpload(photoUrl) ? photoUrl : safeUrl(photoUrl);
  if (photoUrl && !photo) errors.photoUrl = "Bitte eine gültige Bildadresse angeben.";

  const video = safeUrl(videoUrl);
  if (videoUrl && !video) errors.videoUrl = "Bitte eine gültige Videoadresse angeben.";

  const website = safeUrl(websiteUrl);
  if (websiteUrl && !website) errors.websiteUrl = "Bitte eine gültige Webadresse angeben.";

  let allbreed: string | null = null;
  if (allbreedUrl) {
    const normalized = safeUrl(allbreedUrl);
    if (!normalized || !isValidAllbreedUrl(normalized)) {
      errors.allbreedUrl =
        "Bitte einen Link auf allbreedpedigree.com angeben oder das Feld leer lassen.";
    } else {
      allbreed = normalized;
    }
  }

  if (!consent) {
    errors.consent =
      "Bitte bestätige, dass du die Angaben veröffentlichen darfst.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    errors,
    values,
    horse: {
      name,
      aka: nullIfEmpty(aka),
      sex,
      breed: nullIfEmpty(breed),
      registryNo: nullIfEmpty(registryNo.slice(0, MAX.registry)),
      yearOfBirth,
      yearOfDeath,
      color: nullIfEmpty(color.slice(0, MAX.short)),
      heightCm,
      country: nullIfEmpty(country),
      location: nullIfEmpty(location.slice(0, MAX.short)),
      studName: nullIfEmpty(studName.slice(0, MAX.short)),
      disciplines,
      description: nullIfEmpty(description),
      showRecord: nullIfEmpty(showRecord),
      offspring: nullIfEmpty(offspring),
      bloodlineNote: nullIfEmpty(bloodlineNote),
      sireName: nullIfEmpty(sireName.slice(0, MAX.name)),
      damName: nullIfEmpty(damName.slice(0, MAX.name)),
      genetics,
      availability,
      photoUrl: photo,
      photoCredit: nullIfEmpty(photoCredit.slice(0, MAX.short)),
      videoUrl: video,
      websiteUrl: website,
      allbreedUrl: allbreed,
      ownerName: nullIfEmpty(ownerName.slice(0, MAX.short)),
      contactEmail: nullIfEmpty(contactEmail),
      contactPhone: nullIfEmpty(contactPhone.slice(0, MAX.short)),
      isHistoric: false,
      isVerified: false,
      // Neue Einsendungen werden immer erst geprüft, bevor sie öffentlich sind.
      status: "pending",
      source: "community",
      submitterEmail: nullIfEmpty(submitterEmail),
      adminNote: null,
    },
  };
}
