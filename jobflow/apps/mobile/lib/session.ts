import { createContext, useContext } from "react";
import * as SecureStore from "expo-secure-store";
import type { AuthResult, User } from "@jobflow/types";
import { setAuthToken } from "./api.js";

/**
 * Sitzungsverwaltung.
 *
 * Das Token liegt im sicheren Speicher des Geraets (Keychain bzw. Keystore),
 * nicht in AsyncStorage: dort waere es auf einem entsperrten oder gerooteten
 * Geraet im Klartext lesbar.
 */
const TOKEN_KEY = "jobflow.session.token";

export interface SessionState {
  user: User | null;
  loading: boolean;
  signIn(result: AuthResult): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
}

export const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const session = useContext(SessionContext);
  if (session === null) {
    throw new Error("useSession darf nur innerhalb des SessionProvider verwendet werden.");
  }
  return session;
}

export async function readStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // Auf manchen Geraeten ist der sichere Speicher nicht verfuegbar. Dann
    // muss sich der Nutzer eben neu anmelden - das ist besser, als das Token
    // ersatzweise ungeschuetzt abzulegen.
    return null;
  }
}

export async function storeToken(token: string | null): Promise<void> {
  setAuthToken(token);
  try {
    if (token === null) await SecureStore.deleteItemAsync(TOKEN_KEY);
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // Siehe oben: nicht speichern zu koennen ist unschoen, aber kein Grund,
    // die Anmeldung scheitern zu lassen.
  }
}
