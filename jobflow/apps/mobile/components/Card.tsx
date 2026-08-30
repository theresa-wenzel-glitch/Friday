import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radii, shadows, spacing } from "@jobflow/config";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/** Grosse, weich gerundete Karte - das praegende Element der Oberflaeche. */
export function Card({ children, onPress, style, accessibilityLabel }: Props) {
  if (onPress === undefined) {
    return <View style={[styles.card, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      {...(accessibilityLabel === undefined ? {} : { accessibilityLabel })}
      style={({ pressed }) => [styles.card, style, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  pressed: { opacity: 0.9 },
});
