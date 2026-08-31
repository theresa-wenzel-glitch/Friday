import type { IsoDateTime, Uuid } from "./common.js";

/**
 * Rollen der Plattform.
 *
 * CUSTOMER und BUSINESS werden bei der Registrierung gewählt.
 * BUSINESS_EMPLOYEE wird von einem Unternehmen vergeben, ADMIN nur intern.
 */
export const USER_ROLES = ["CUSTOMER", "BUSINESS", "BUSINESS_EMPLOYEE", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Rollen, die sich selbst registrieren dürfen. */
export const SELF_SIGNUP_ROLES = ["CUSTOMER", "BUSINESS"] as const;
export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

/**
 * Ein Benutzer, so wie ihn die API nach außen gibt.
 * Das Passwort-Hash verlässt das Backend niemals.
 */
export interface User {
  id: Uuid;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  /** Gesperrte Konten können sich nicht anmelden. */
  blockedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Ergebnis von /auth/register und /auth/login. */
export interface AuthResult {
  user: User;
  /** Bearer-Token für den Authorization-Header. */
  token: string;
  expiresAt: IsoDateTime;
}
