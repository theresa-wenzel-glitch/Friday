import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, spacing, typography } from "@jobflow/config";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Screen } from "../../components/Screen.js";
import { useSession } from "../../lib/session.js";

export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  async function logout(): Promise<void> {
    setBusy(true);
    await signOut();
    router.replace("/");
  }

  const roleLabel =
    user?.role === "CUSTOMER"
      ? "Kundenkonto"
      : user?.role === "BUSINESS"
        ? "Unternehmenskonto"
        : user?.role === "BUSINESS_EMPLOYEE"
          ? "Mitarbeiterkonto"
          : "Konto";

  return (
    <Screen>
      <Text style={styles.title}>Profil</Text>

      <Card>
        <Text style={styles.name}>{user?.name ?? ""}</Text>
        <Text style={styles.detail}>{user?.email ?? ""}</Text>
        <Text style={styles.detail}>{roleLabel}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Deine Daten</Text>
        <Text style={styles.text}>
          JobFlow speichert deine Anfragen, Angebote und Termine. Standortangaben werden nur so genau
          gespeichert, wie es fuer die Vermittlung noetig ist - die vollstaendige Adresse erfaehrt erst
          das Unternehmen, das du beauftragst.
        </Text>
      </Card>

      <View style={styles.actions}>
        <Button title="Abmelden" variant="secondary" loading={busy} onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  name: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  detail: { fontSize: typography.sizes.small, color: colors.textMuted, marginTop: spacing.xs },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  text: { fontSize: typography.sizes.small, color: colors.textMuted, lineHeight: 20 },
  actions: { marginTop: spacing.lg },
});
