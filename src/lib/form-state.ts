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

export interface ImportAction {
  name: string;
  kind: "create" | "update" | "unchanged";
  sex: "stallion" | "mare" | "gelding";
  detail: string;
}

export interface ImportState {
  status: "idle" | "preview" | "done";
  text: string;
  errors?: string[];
  actions?: ImportAction[];
  counts?: { create: number; update: number; unchanged: number };
  message?: string;
}

export const EMPTY_IMPORT_STATE: ImportState = { status: "idle", text: "" };
