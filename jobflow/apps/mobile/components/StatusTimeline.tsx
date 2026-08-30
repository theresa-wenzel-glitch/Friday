import { StyleSheet, Text, View } from "react-native";
import { colors, requestTimeline, spacing, typography } from "@jobflow/config";
import type { RequestStatus } from "@jobflow/types";

/**
 * Der Fortschritt einer Anfrage als Zeitstrahl.
 *
 * Das ist kein Schmuck: Vertrauen entsteht daraus, dass der Kunde jederzeit
 * sieht, wo sein Anliegen steht - gerade wenn zwischen Anfrage und Termin
 * mehrere Tage liegen.
 */
const ORDER: RequestStatus[] = ["OPEN", "MATCHING", "OFFERED", "ACCEPTED", "COMPLETED"];

interface Props {
  status: RequestStatus;
}

export function StatusTimeline({ status }: Props) {
  // DRAFT und ANALYZING liegen vor dem ersten Schritt, CANCELLED daneben.
  const currentIndex = ORDER.indexOf(status);

  return (
    <View style={styles.wrapper} accessibilityRole="progressbar">
      {requestTimeline.map((step, index) => {
        const done = currentIndex > index;
        const active = currentIndex === index;
        return (
          <View key={step.status} style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={[styles.marker, done ? styles.markerDone : active ? styles.markerActive : styles.markerOpen]}>
                <Text style={[styles.markerText, done || active ? styles.markerTextOn : null]}>
                  {done ? "✓" : active ? "●" : "○"}
                </Text>
              </View>
              {index < requestTimeline.length - 1 ? (
                <View style={[styles.connector, done ? styles.connectorDone : null]} />
              ) : null}
            </View>
            <Text style={[styles.label, done || active ? styles.labelReached : null]}>{step.label}</Text>
          </View>
        );
      })}
      {status === "CANCELLED" ? <Text style={styles.cancelled}>Diese Anfrage wurde zurueckgezogen.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 0 },
  row: { flexDirection: "row", gap: spacing.md },
  markerColumn: { alignItems: "center", width: 28 },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  markerDone: { backgroundColor: colors.success },
  markerActive: { backgroundColor: colors.primary },
  markerOpen: { backgroundColor: colors.surfaceMuted },
  markerText: { fontSize: typography.sizes.caption, color: colors.textMuted },
  markerTextOn: { color: colors.textInverted },
  connector: { width: 2, flex: 1, minHeight: 20, backgroundColor: colors.border },
  connectorDone: { backgroundColor: colors.success },
  label: {
    flex: 1,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    paddingBottom: spacing.lg,
  },
  labelReached: { color: colors.text, fontWeight: typography.weights.medium },
  cancelled: { fontSize: typography.sizes.small, color: colors.error, marginTop: spacing.sm },
});
