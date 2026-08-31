import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, shadows, spacing, typography } from "@jobflow/config";
import type { Category } from "@jobflow/types";

interface Props {
  category: Category;
  onPress: (category: Category) => void;
}

export function CategoryCard({ category, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={category.name}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <Text style={styles.icon}>{category.icon ?? "🔧"}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    // Drei Karten pro Zeile mit den Abständen dazwischen.
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 96,
    ...shadows.card,
  },
  pressed: { opacity: 0.9 },
  icon: { fontSize: 28 },
  name: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    textAlign: "center",
  },
});
