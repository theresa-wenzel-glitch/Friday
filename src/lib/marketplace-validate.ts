import { EMAIL_RE } from "./validate";
import { DISCIPLINES, SEXES, type Sex } from "./types";
import type { ListingInput } from "./marketplace-db";
import type { ListingKind } from "./marketplace-types";

export interface RegistrationInput {
  email: string;
  password: string;
  displayName: string;
  phone: string | null;
}

export interface RegistrationValidation {
  ok: boolean;
  errors: Record<string, string>;
  values: Record<string, string>;
  data?: RegistrationInput;
}

const MAX_DISPLAY_NAME = 80;
const MAX_PHONE = 40;
const MIN_PASSWORD = 8;

function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function validateRegistration(form: FormData): RegistrationValidation {
  const errors: Record<string, string> = {};
  const values: Record<string, string> = {};

  const keep = (key: string): string => {
    const value = str(form, key);
    values[key] = key === "password" ? "" : value; // Passwort nie zurückspiegeln
    return value;
  };

  const email = keep("email");
  const password = str(form, "password");
  const passwordConfirm = str(form, "passwordConfirm");
  const displayName = keep("displayName");
  const phone = keep("phone");

  // Honeypot: für Menschen unsichtbares Feld, ist es gefüllt war es ein Bot.
  if (str(form, "website")) {
    errors._spam = "Die Anmeldung wurde als automatisiert erkannt.";
  }

  if (!email) {
    errors.email = "Bitte eine E-Mail-Adresse angeben.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Diese E-Mail-Adresse sieht nicht gültig aus.";
  }

  if (password.length < MIN_PASSWORD) {
    errors.password = `Das Passwort muss mindestens ${MIN_PASSWORD} Zeichen lang sein.`;
  } else if (password !== passwordConfirm) {
    errors.passwordConfirm = "Die Passwörter stimmen nicht überein.";
  }

  if (displayName.length < 2) {
    errors.displayName =
      "Bitte einen Namen für Hof/Station/Besitzer angeben (mindestens 2 Zeichen).";
  } else if (displayName.length > MAX_DISPLAY_NAME) {
    errors.displayName = `Der Name darf höchstens ${MAX_DISPLAY_NAME} Zeichen lang sein.`;
  }

  if (phone.length > MAX_PHONE) {
    errors.phone = "Die Telefonnummer ist zu lang.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    errors,
    values,
    data: {
      email,
      password,
      displayName,
      phone: phone || null,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Marktplatz-Inserate                                                 */
/* ------------------------------------------------------------------ */

export interface ListingValidation {
  ok: boolean;
  errors: Record<string, string>;
  values: Record<string, string>;
  listing?: Omit<ListingInput, "accountId">;
}

const MAX_LISTING = {
  name: 80,
  short: 120,
  text: 4000,
  priceLabel: 80,
};

const CURRENT_YEAR = new Date().getFullYear();

function nullIfEmpty(value: string): string | null {
  return value.length > 0 ? value : null;
}

export function validateListingSubmission(form: FormData): ListingValidation {
  const errors: Record<string, string> = {};
  const values: Record<string, string> = {};

  const keep = (key: string): string => {
    const value = str(form, key);
    values[key] = value;
    return value;
  };

  const kindRaw = keep("kind") || "stud";
  const name = keep("name");
  const sexRaw = keep("sex") || "stallion";
  const breed = keep("breed");
  const yearRaw = keep("yearOfBirth");
  const color = keep("color");
  const country = keep("country").toUpperCase();
  const location = keep("location");
  const description = keep("description");
  const priceRaw = keep("price");
  const priceLabel = keep("priceLabel");
  const photoUrl = keep("photoUrl");
  const contactName = keep("contactName");
  const contactEmail = keep("contactEmail");
  const contactPhone = keep("contactPhone");

  // Honeypot.
  if (str(form, "website")) {
    errors._spam = "Die Einsendung wurde als automatisiert erkannt.";
  }

  const kind: ListingKind = kindRaw === "sale" ? "sale" : "stud";
  const sex: Sex = SEXES.includes(sexRaw as Sex) ? (sexRaw as Sex) : "stallion";

  if (name.length < 2) {
    errors.name = "Bitte den Namen des Pferdes angeben (mindestens 2 Zeichen).";
  } else if (name.length > MAX_LISTING.name) {
    errors.name = `Der Name darf höchstens ${MAX_LISTING.name} Zeichen lang sein.`;
  }

  let yearOfBirth: number | null = null;
  if (yearRaw) {
    const parsed = Number(yearRaw);
    if (!Number.isInteger(parsed) || parsed < 1980 || parsed > CURRENT_YEAR + 1) {
      errors.yearOfBirth = `Bitte ein Geburtsjahr zwischen 1980 und ${CURRENT_YEAR + 1} angeben.`;
    } else {
      yearOfBirth = parsed;
    }
  }

  if (country && !/^[A-Z]{2}$/.test(country)) {
    errors.country = "Bitte das Land als zweistelligen Code angeben, z. B. DE, AT, US.";
  }

  const disciplines = form
    .getAll("disciplines")
    .filter((v): v is string => typeof v === "string")
    .filter((v) => (DISCIPLINES as readonly string[]).includes(v));

  if (description.length > MAX_LISTING.text) {
    errors.description = `Die Beschreibung: bitte auf ${MAX_LISTING.text} Zeichen kürzen.`;
  }

  let priceCents: number | null = null;
  if (priceRaw) {
    // Komma oder Punkt als Dezimaltrenner zulassen ("1200" oder "1200,50").
    const normalized = priceRaw.replace(",", ".");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
      errors.price = "Bitte einen gültigen Preis angeben (oder leer lassen für „auf Anfrage“).";
    } else {
      priceCents = Math.round(parsed * 100);
    }
  }

  if (priceLabel.length > MAX_LISTING.priceLabel) {
    errors.priceLabel = "Der Zusatz zum Preis ist zu lang.";
  }

  if (!contactEmail) {
    errors.contactEmail =
      "Bitte eine Kontaktadresse angeben - ohne sie kann niemand nachfragen.";
  } else if (!EMAIL_RE.test(contactEmail)) {
    errors.contactEmail = "Diese E-Mail-Adresse sieht nicht gültig aus.";
  }

  if (photoUrl) {
    const match = photoUrl.match(/^\/api\/uploads\/([^/?#]+)$/);
    if (!match) {
      errors.photoUrl = "Bitte ein Foto über den Upload hinzufügen.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    errors,
    values,
    listing: {
      horseId: null,
      kind,
      name,
      sex,
      breed: nullIfEmpty(breed),
      yearOfBirth,
      color: nullIfEmpty(color.slice(0, MAX_LISTING.short)),
      country: nullIfEmpty(country),
      location: nullIfEmpty(location.slice(0, MAX_LISTING.short)),
      disciplines,
      description: nullIfEmpty(description),
      priceCents,
      priceCurrency: "EUR",
      priceLabel: nullIfEmpty(priceLabel),
      photoUrl: nullIfEmpty(photoUrl),
      contactName: nullIfEmpty(contactName.slice(0, MAX_LISTING.short)),
      contactEmail: nullIfEmpty(contactEmail),
      contactPhone: nullIfEmpty(contactPhone.slice(0, MAX_LISTING.short)),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Kontaktanfragen                                                     */
/* ------------------------------------------------------------------ */

export interface InquiryValidation {
  ok: boolean;
  errors: Record<string, string>;
  data?: {
    senderName: string;
    senderEmail: string;
    senderPhone: string | null;
    message: string;
  };
}

export function validateInquiry(form: FormData): InquiryValidation {
  const errors: Record<string, string> = {};

  const senderName = str(form, "senderName");
  const senderEmail = str(form, "senderEmail");
  const senderPhone = str(form, "senderPhone");
  const message = str(form, "message");

  // Honeypot.
  if (str(form, "website")) {
    errors._spam = "Die Anfrage wurde als automatisiert erkannt.";
  }

  if (senderName.length < 2) {
    errors.senderName = "Bitte deinen Namen angeben.";
  }

  if (!senderEmail) {
    errors.senderEmail = "Bitte eine E-Mail-Adresse angeben, damit geantwortet werden kann.";
  } else if (!EMAIL_RE.test(senderEmail)) {
    errors.senderEmail = "Diese E-Mail-Adresse sieht nicht gültig aus.";
  }

  if (message.length < 10) {
    errors.message = "Bitte kurz schreiben, worum es geht (mindestens 10 Zeichen).";
  } else if (message.length > 2000) {
    errors.message = "Bitte auf 2000 Zeichen kürzen.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors,
    data: {
      senderName,
      senderEmail,
      senderPhone: senderPhone || null,
      message,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Auktionen                                                           */
/* ------------------------------------------------------------------ */

export interface AuctionInputData {
  listingId: number | null;
  title: string;
  description: string | null;
  seasonNote: string | null;
  startAt: string;
  endAt: string;
  startingPriceCents: number;
  minIncrementCents: number;
  currency: string;
  feeType: "flat" | "percent";
  feeAmountCents: number | null;
  feePercent: number | null;
}

export interface AuctionValidation {
  ok: boolean;
  errors: Record<string, string>;
  values: Record<string, string>;
  data?: AuctionInputData;
}

const MAX_AUCTION_TITLE = 120;
const MAX_AUCTION_TEXT = 4000;

/** Feste Auktionsgebühr, solange kein anderes Preiskonzept beschlossen ist. */
const FLAT_FEE_CENTS = 2500;

export function validateAuctionSubmission(form: FormData): AuctionValidation {
  const errors: Record<string, string> = {};
  const values: Record<string, string> = {};

  const keep = (key: string): string => {
    const value = str(form, key);
    values[key] = value;
    return value;
  };

  const title = keep("title");
  const description = keep("description");
  const seasonNote = keep("seasonNote");
  const startAtRaw = keep("startAt");
  const endAtRaw = keep("endAt");
  const startingPriceRaw = keep("startingPrice");
  const minIncrementRaw = keep("minIncrement") || "10";

  if (str(form, "website")) {
    errors._spam = "Die Einsendung wurde als automatisiert erkannt.";
  }

  if (title.length < 3) {
    errors.title = "Bitte einen Titel angeben (mindestens 3 Zeichen).";
  } else if (title.length > MAX_AUCTION_TITLE) {
    errors.title = `Der Titel darf höchstens ${MAX_AUCTION_TITLE} Zeichen lang sein.`;
  }

  if (description.length > MAX_AUCTION_TEXT) {
    errors.description = `Die Beschreibung: bitte auf ${MAX_AUCTION_TEXT} Zeichen kürzen.`;
  }

  const startAt = new Date(startAtRaw);
  const endAt = new Date(endAtRaw);
  const now = new Date();

  // Kleine Gnadenfrist statt strikt "muss in der Zukunft liegen": das Formular
  // braucht Zeit zum Ausfüllen, und datetime-local rundet auf die Minute.
  const START_GRACE_MS = 15 * 60 * 1000;
  if (!startAtRaw || Number.isNaN(startAt.getTime())) {
    errors.startAt = "Bitte einen gültigen Beginn angeben.";
  } else if (startAt.getTime() < now.getTime() - START_GRACE_MS) {
    errors.startAt = "Der Beginn darf nicht so weit in der Vergangenheit liegen.";
  }

  if (!endAtRaw || Number.isNaN(endAt.getTime())) {
    errors.endAt = "Bitte ein gültiges Ende angeben.";
  } else if (!errors.startAt && endAt <= startAt) {
    errors.endAt = "Das Ende muss nach dem Beginn liegen.";
  }

  let startingPriceCents = 0;
  if (startingPriceRaw) {
    const parsed = Number(startingPriceRaw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
      errors.startingPrice = "Bitte ein gültiges Startgebot angeben.";
    } else {
      startingPriceCents = Math.round(parsed * 100);
    }
  }

  let minIncrementCents = 1000;
  const parsedIncrement = Number(minIncrementRaw.replace(",", "."));
  if (!Number.isFinite(parsedIncrement) || parsedIncrement <= 0 || parsedIncrement > 100_000) {
    errors.minIncrement = "Bitte eine gültige Mindeststeigerung angeben.";
  } else {
    minIncrementCents = Math.round(parsedIncrement * 100);
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    errors,
    values,
    data: {
      listingId: null,
      title,
      description: nullIfEmpty(description),
      seasonNote: nullIfEmpty(seasonNote),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      startingPriceCents,
      minIncrementCents,
      currency: "EUR",
      feeType: "flat",
      feeAmountCents: FLAT_FEE_CENTS,
      feePercent: null,
    },
  };
}

export interface BidValidation {
  ok: boolean;
  error?: string;
  amountCents?: number;
}

export function validateBidAmount(raw: string): BidValidation {
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000) {
    return { ok: false, error: "Bitte ein gültiges Gebot angeben." };
  }
  return { ok: true, amountCents: Math.round(parsed * 100) };
}
