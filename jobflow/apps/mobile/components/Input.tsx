import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { colors, radii, spacing, typography } from "@jobflow/config";

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Fehlermeldung aus der Validierung - lokal oder vom Server. */
  error?: string | undefined;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words";
  hint?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize = "sentences",
  hint,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        {...(placeholder === undefined ? {} : { placeholder })}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        {...(keyboardType === undefined ? {} : { keyboardType })}
        autoCapitalize={autoCapitalize}
        autoCorrect={!secureTextEntry}
        accessibilityLabel={label}
        style={[styles.input, multiline ? styles.multiline : null, error ? styles.inputError : null]}
      />
      {/* Der Hinweis verschwindet, sobald ein Fehler angezeigt wird - zwei
          Zeilen Kleingedrucktes unter einem Feld liest niemand. */}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.body,
    color: colors.text,
    minHeight: 52,
  },
  multiline: { minHeight: 120, textAlignVertical: "top", paddingTop: spacing.md },
  inputError: { borderColor: colors.error },
  error: { fontSize: typography.sizes.caption, color: colors.error },
  hint: { fontSize: typography.sizes.caption, color: colors.textMuted },
});
