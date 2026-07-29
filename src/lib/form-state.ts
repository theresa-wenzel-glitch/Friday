/**
 * Zustandsobjekte der Formulare.
 *
 * Bewusst NICHT in den "use server"-Dateien: aus denen darf ausschliesslich
 * exportiert werden, was eine async-Funktion ist. Konstanten kommen dort auf
 * dem Client als `undefined` an.
 */

export interface SubmitState {
  status: "idle" | "error";
  errors: Record<string, string>;
  values: Record<string, string>;
}

export const EMPTY_SUBMIT_STATE: SubmitState = {
  status: "idle",
  errors: {},
  values: {},
};

export interface ContactState {
  status: "idle" | "revealed" | "error";
  email?: string;
  message?: string;
}

export const EMPTY_CONTACT_STATE: ContactState = { status: "idle" };

export interface CorrectionState {
  status: "idle" | "sent" | "error";
  message?: string;
}

export const EMPTY_CORRECTION_STATE: CorrectionState = { status: "idle" };

export interface LoginState {
  error?: string;
}

export const EMPTY_LOGIN_STATE: LoginState = {};
