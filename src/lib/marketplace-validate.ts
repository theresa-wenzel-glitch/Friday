import { EMAIL_RE } from "./validate";

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
