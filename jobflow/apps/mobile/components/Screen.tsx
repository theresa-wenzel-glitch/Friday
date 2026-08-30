import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@jobflow/config";

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

/** Grundgeruest jedes Screens: sicherer Bereich, Hintergrund, grosszuegige Abstaende. */
export function Screen({ children, scroll = true, style }: Props) {
  const content = <View style={[styles.content, style]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
});
