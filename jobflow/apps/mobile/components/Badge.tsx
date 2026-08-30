import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@jobflow/config";

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "ai";

interface Props {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = "neutral" }: Props) {
  return (
    <View style={[styles.badge, backgrounds[tone]]}>
      <Text style={[styles.label, foregrounds[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  label: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
});

const backgrounds = StyleSheet.create({
  neutral: { backgroundColor: colors.surfaceMuted },
  success: { backgroundColor: colors.successLight },
  warning: { backgroundColor: colors.warningLight },
  error: { backgroundColor: colors.errorLight },
  ai: { backgroundColor: colors.aiLight },
});

const foregrounds = StyleSheet.create({
  neutral: { color: colors.textMuted },
  success: { color: colors.success },
  warning: { color: colors.warning },
  error: { color: colors.error },
  ai: { color: colors.ai },
});
