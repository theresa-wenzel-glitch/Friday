import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, spacing, typography } from "@jobflow/config";
import { Button } from "../components/Button.js";
import { Screen } from "../components/Screen.js";
import { useSession } from "../lib/session.js";

/**
 * Screen 01 - Willkommen.
 *
 * Wer bereits angemeldet ist, sieht diesen Screen gar nicht erst, sondern
 * landet direkt in seinem Bereich.
 */
export default function WelcomeScreen() {
  const { user, loading } = useSession();

  useEffect(() => {
    if (loading || user === null) return;
    router.replace(user.role === "CUSTOMER" ? "/(app)/home" : "/(app)/dashboard");
  }, [user, loading]);

  if (loading) {
    return (
      <Screen scroll={false} style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} style={styles.wrapper}>
      <View style={styles.hero}>
        <Text style={styles.logo}>JobFlow</Text>
        <Text style={styles.slogan}>Von der Anfrage zum Auftrag.</Text>
        <Text style={styles.pitch}>
          Sag uns einfach, was los ist. Wir kümmern uns um den Rest.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Konto erstellen" onPress={() => router.push("/(auth)/register")} />
        <Button title="Anmelden" variant="secondary" onPress={() => router.push("/(auth)/login")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { justifyContent: "space-between", paddingVertical: spacing.xxxl },
  center: { alignItems: "center", justifyContent: "center" },
  hero: { flex: 1, justifyContent: "center", gap: spacing.md },
  logo: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  slogan: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  pitch: { fontSize: typography.sizes.body, color: colors.textMuted, lineHeight: 24 },
  actions: { gap: spacing.md },
});
