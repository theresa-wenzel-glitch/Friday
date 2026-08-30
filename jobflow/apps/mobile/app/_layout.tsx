import { useCallback, useEffect, useMemo, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { AuthResult, User } from "@jobflow/types";
import { colors } from "@jobflow/config";
import { api, setAuthToken } from "../lib/api.js";
import { readStoredToken, SessionContext, storeToken, type SessionState } from "../lib/session.js";

/**
 * Wurzel der App.
 *
 * Hier entsteht die Sitzung, und von hier aus verzweigt die App in den
 * Kunden- oder den Unternehmensbereich. Beide Rollen teilen sich dieselbe
 * Codebasis, bekommen aber voellig unterschiedliche Oberflaechen.
 */
export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.get<User>("/me"));
    } catch {
      // Token abgelaufen, zurueckgezogen oder Konto gesperrt.
      await storeToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await readStoredToken();
      if (token !== null) {
        setAuthToken(token);
        await refresh();
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const session = useMemo<SessionState>(
    () => ({
      user,
      loading,
      signIn: async (result: AuthResult) => {
        await storeToken(result.token);
        setUser(result.user);
      },
      signOut: async () => {
        // Erst serverseitig abmelden, damit das Token sofort wertlos wird -
        // und danach lokal aufraeumen, auch wenn der Aufruf scheitert.
        try {
          await api.post("/auth/logout");
        } catch {
          // Kein Netz. Lokal abmelden ist trotzdem richtig.
        }
        await storeToken(null);
        setUser(null);
      },
      refresh,
    }),
    [user, loading, refresh],
  );

  return (
    <SafeAreaProvider>
      <SessionContext.Provider value={session}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </SessionContext.Provider>
    </SafeAreaProvider>
  );
}
