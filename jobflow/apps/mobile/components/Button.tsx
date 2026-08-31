import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@jobflow/config";

/**
 * Der Button von JobFlow.
 *
 * Absichtlich groß und deutlich: die App wird oft unterwegs bedient, teils
 * einhändig, teils in einem Keller mit schlechtem Licht.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Emoji oder kurzes Zeichen links vom Text. */
  icon?: string;
}

export function Button({ title, onPress, variant = "primary", disabled = false, loading = false, icon }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !inactive ? styles.pressed : null,
        inactive ? styles.inactive : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? colors.textInverted : colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={[styles.label, labelStyles[variant]]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    // Empfohlene Mindestgröße für Bedienelemente.
    minHeight: 52,
  },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icon: { fontSize: typography.sizes.title },
  label: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryLight },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: colors.error },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.textInverted },
  secondary: { color: colors.primaryDark },
  ghost: { color: colors.primary },
  danger: { color: colors.textInverted },
});
