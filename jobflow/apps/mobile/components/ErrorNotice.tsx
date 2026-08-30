import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@jobflow/config";

interface Props {
  message: string | null;
}

/** Einheitliche Fehleranzeige. Zeigt nichts, wenn es nichts zu zeigen gibt. */
export function ErrorNotice({ message }: Props) {
  if (message === null) return null;
  return (
    <View style={styles.wrapper} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  text: { color: colors.error, fontSize: typography.sizes.small },
});
