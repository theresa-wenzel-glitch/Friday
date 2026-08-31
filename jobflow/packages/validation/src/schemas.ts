import { SELF_SIGNUP_ROLES, URGENCIES } from "@jobflow/types";
import {
  array,
  boolean,
  email,
  isoDateTime,
  latitude,
  longitude,
  nullable,
  number,
  object,
  oneOf,
  optional,
  refine,
  string,
  uuid,
  withDefault,
  type Validator,
} from "./core.js";

/**
 * Passwortregeln.
 *
 * Bewusst nur eine Mindestlänge statt Zeichenklassen-Zwang: Länge ist der
 * Faktor, der tatsächlich schützt, und erzwungene Sonderzeichen führen in der
 * Praxis zu schlechteren Passwörtern.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

export const passwordSchema = string({
  min: PASSWORD_MIN_LENGTH,
  max: PASSWORD_MAX_LENGTH,
  trim: false,
});

// --- Authentifizierung -----------------------------------------------------

export const registerSchema = object({
  email: email(),
  name: string({ min: 2, max: 120 }),
  password: passwordSchema,
  role: withDefault(oneOf(SELF_SIGNUP_ROLES), "CUSTOMER" as const),
  phone: optional(nullable(string({ min: 5, max: 40 }))),
});

export const loginSchema = object({
  email: email(),
  password: string({ min: 1, max: PASSWORD_MAX_LENGTH, trim: false }),
});

// --- Anfragen --------------------------------------------------------------

export const REQUEST_DESCRIPTION_MIN = 10;
export const REQUEST_DESCRIPTION_MAX = 4000;

export const createRequestSchema = refine(
  object({
    categoryId: optional(nullable(uuid())),
    title: optional(nullable(string({ min: 3, max: 140 }))),
    description: string({ min: REQUEST_DESCRIPTION_MIN, max: REQUEST_DESCRIPTION_MAX }),
    urgency: withDefault(oneOf(URGENCIES), "NORMAL" as const),
    latitude: optional(nullable(latitude())),
    longitude: optional(nullable(longitude())),
    locationLabel: optional(nullable(string({ min: 2, max: 140 }))),
    desiredFrom: optional(nullable(isoDateTime())),
    desiredTo: optional(nullable(isoDateTime())),
  }),
  (value) => {
    // Eine halbe Koordinate ist wertlos - entweder beides oder nichts.
    const hasLat = value.latitude !== null && value.latitude !== undefined;
    const hasLon = value.longitude !== null && value.longitude !== undefined;
    if (hasLat !== hasLon) return "Bitte Breiten- und Längengrad gemeinsam angeben.";
    if (value.desiredFrom && value.desiredTo && value.desiredFrom > value.desiredTo) {
      return "Das Ende des Zeitraums liegt vor seinem Beginn.";
    }
    return null;
  },
);

export const updateRequestSchema = object({
  title: optional(nullable(string({ min: 3, max: 140 }))),
  description: optional(string({ min: REQUEST_DESCRIPTION_MIN, max: REQUEST_DESCRIPTION_MAX })),
  urgency: optional(oneOf(URGENCIES)),
  categoryId: optional(nullable(uuid())),
  locationLabel: optional(nullable(string({ min: 2, max: 140 }))),
  desiredFrom: optional(nullable(isoDateTime())),
  desiredTo: optional(nullable(isoDateTime())),
});

export const answerQuestionSchema = object({
  answer: string({ min: 1, max: 1000 }),
});

// --- KI --------------------------------------------------------------------

/**
 * Schema für das, was ein KI-Provider zurückliefert.
 *
 * Wichtig: Auch die KI ist eine untrusted source. Ihr Ergebnis wird genauso
 * validiert wie eine Eingabe aus der App, bevor es in die Datenbank darf.
 */
export const aiAnalysisResultSchema = object({
  categorySlug: nullable(string({ min: 1, max: 80, pattern: /^[a-z0-9-]+$/ })),
  summary: string({ min: 3, max: 500 }),
  urgency: withDefault(oneOf(URGENCIES), "NORMAL" as const),
  questions: withDefault(array(string({ min: 3, max: 300 }), { max: 5 }), []),
  confidence: number({ min: 0, max: 1 }),
});

// --- Unternehmen -----------------------------------------------------------

export const businessProfileSchema = object({
  name: string({ min: 2, max: 140 }),
  description: optional(nullable(string({ min: 10, max: 2000 }))),
  latitude: optional(nullable(latitude())),
  longitude: optional(nullable(longitude())),
  serviceRadiusKm: withDefault(number({ min: 1, max: 300, int: true }), 30),
});

export const businessServiceSchema = refine(
  object({
    categoryId: uuid(),
    name: string({ min: 2, max: 140 }),
    description: optional(nullable(string({ min: 5, max: 1000 }))),
    priceMinCents: optional(nullable(number({ min: 0, max: 100_000_000, int: true }))),
    priceMaxCents: optional(nullable(number({ min: 0, max: 100_000_000, int: true }))),
  }),
  (value) => {
    if (
      value.priceMinCents !== null &&
      value.priceMinCents !== undefined &&
      value.priceMaxCents !== null &&
      value.priceMaxCents !== undefined &&
      value.priceMinCents > value.priceMaxCents
    ) {
      return "Der Mindestpreis darf nicht über dem Höchstpreis liegen.";
    }
    return null;
  },
);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const availabilitySlotSchema = refine(
  object({
    weekday: number({ min: 0, max: 6, int: true }),
    startTime: string({ pattern: TIME_PATTERN, patternMessage: "Bitte im Format HH:MM angeben." }),
    endTime: string({ pattern: TIME_PATTERN, patternMessage: "Bitte im Format HH:MM angeben." }),
  }),
  (value) => (value.startTime >= value.endTime ? "Das Ende muss nach dem Beginn liegen." : null),
);

export const availabilityScheduleSchema = object({
  slots: array(availabilitySlotSchema, { max: 40 }),
});

// --- Angebote --------------------------------------------------------------

const moneyCents = number({ min: 0, max: 100_000_000, int: true });

export const createOfferSchema = refine(
  object({
    requestId: uuid(),
    laborCents: moneyCents,
    materialCents: withDefault(moneyCents, 0),
    travelCents: withDefault(moneyCents, 0),
    description: string({ min: 10, max: 3000 }),
    validUntil: isoDateTime(),
    descriptionAiAssisted: withDefault(boolean(), false),
  }),
  (value) => {
    const total = value.laborCents + value.materialCents + value.travelCents;
    if (total <= 0) return "Das Angebot muss einen Betrag größer als 0 enthalten.";
    if (total > 100_000_000) return "Der Gesamtbetrag ist zu hoch.";
    return null;
  },
);

// --- Termine ---------------------------------------------------------------

export const createAppointmentSchema = refine(
  object({
    offerId: uuid(),
    startTime: isoDateTime(),
    endTime: isoDateTime(),
  }),
  (value) => (value.startTime >= value.endTime ? "Das Ende muss nach dem Beginn liegen." : null),
);

// --- Nachrichten -----------------------------------------------------------

export const sendMessageSchema = object({
  body: string({ min: 1, max: 4000 }),
  isAiGenerated: withDefault(boolean(), false),
});

// --- Bewertungen -----------------------------------------------------------

export const createReviewSchema = object({
  jobId: uuid(),
  rating: number({ min: 1, max: 5, int: true }),
  text: optional(nullable(string({ min: 3, max: 2000 }))),
});

// --- Listen ----------------------------------------------------------------

export const paginationSchema = object({
  limit: withDefault(number({ min: 1, max: 100, int: true }), 20),
  offset: withDefault(number({ min: 0, max: 100_000, int: true }), 0),
});

/** Hilfstyp: der Wert, den ein Schema nach erfolgreicher Prüfung liefert. */
export type Parsed<V> = V extends Validator<infer T> ? T : never;
