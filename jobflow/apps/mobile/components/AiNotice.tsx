import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@jobflow/config";

interface Props {
  children: React.ReactNode;
  /** Selbsteinschätzung der KI, 0 bis 1. */
  confidence?: number | undefined;
}

/**
 * Rahmen für alles, was von der KI kommt.
 *
 * KI-Inhalte bekommen eine eigene Farbe und einen ausdrücklichen Hinweis.
 * Sie dürfen nicht so aussehen, als wären sie garantiert richtig - eine
 * falsch erkannte Kategorie ist kein Beinbruch, eine falsch erkannte Kategorie,
 * die wie eine Tatsache präsentiert wird, schon.
 */
export function AiNotice({ children, confidence }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.icon}>🤖</Text>
        <Text style={styles.title}>Von der KI erkannt</Text>
      </View>
      {children}
      <Text style={styles.disclaimer}>
        {confidence !== undefined && confidence < 0.6
          ? "Die KI ist sich hier unsicher. Bitte prüfe die Angaben und ergänze, was fehlt."
          : "Automatisch erstellt - bitte kurz prüfen."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.aiLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icon: { fontSize: typography.sizes.title },
  title: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.ai,
  },
  disclaimer: { fontSize: typography.sizes.caption, color: colors.textMuted },
});
