import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { AuthResult, SelfSignupRole } from "@jobflow/types";
import { colors, radii, spacing, typography } from "@jobflow/config";
import { PASSWORD_MIN_LENGTH, registerSchema, validate } from "@jobflow/validation";
import { api, ApiClientError } from "../../lib/api.js";
import { useSession } from "../../lib/session.js";
import { Button } from "../../components/Button.js";
import { ErrorNotice } from "../../components/ErrorNotice.js";
import { Input } from "../../components/Input.js";
import { Screen } from "../../components/Screen.js";

export default function RegisterScreen() {
  const { signIn } = useSession();

  const [role, setRole] = useState<SelfSignupRole>("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setMessage(null);

    // Dieselbe Pruefung wie im Backend - hier nur fuer die schnelle Rueckmeldung.
    // Verbindlich entscheidet immer der Server.
    const parsed = validate(registerSchema, { name, email, password, role });
    if (!parsed.ok) {
      setFields(parsed.fields);
      return;
    }
    setFields({});
    setBusy(true);
    try {
      const result = await api.post<AuthResult>("/auth/register", parsed.value);
      await signIn(result);
      router.replace(result.user.role === "CUSTOMER" ? "/(app)/home" : "/(app)/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFields(error.fields);
        setMessage(error.message);
      } else {
        setMessage("Das hat leider nicht geklappt.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.intro}>Wofuer moechtest du JobFlow nutzen?</Text>

      <View style={styles.roles}>
        <RoleOption
          label="Ich suche jemanden"
          description="Problem beschreiben und passende Anbieter finden."
          selected={role === "CUSTOMER"}
          onPress={() => setRole("CUSTOMER")}
        />
        <RoleOption
          label="Ich biete Leistungen an"
          description="Passende Anfragen erhalten und Angebote schreiben."
          selected={role === "BUSINESS"}
          onPress={() => setRole("BUSINESS")}
        />
      </View>

      <Input
        label={role === "BUSINESS" ? "Name des Unternehmens" : "Dein Name"}
        value={name}
        onChangeText={setName}
        placeholder={role === "BUSINESS" ? "HeizPro GmbH" : "Max Mustermann"}
        autoCapitalize="words"
        error={fields["name"]}
      />
      <Input
        label="E-Mail"
        value={email}
        onChangeText={setEmail}
        placeholder="max@example.de"
        keyboardType="email-address"
        autoCapitalize="none"
        error={fields["email"]}
      />
      <Input
        label="Passwort"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        hint={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen. Laenge schuetzt mehr als Sonderzeichen.`}
        error={fields["password"]}
      />

      <ErrorNotice message={message} />
      <Button title="Konto erstellen" onPress={submit} loading={busy} />

      <Pressable onPress={() => router.replace("/(auth)/login")} accessibilityRole="link">
        <Text style={styles.link}>Ich habe schon ein Konto</Text>
      </Pressable>
    </Screen>
  );
}

interface RoleOptionProps {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

function RoleOption({ label, description, selected, onPress }: RoleOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.role, selected ? styles.roleSelected : null]}
    >
      <Text style={[styles.roleLabel, selected ? styles.roleLabelSelected : null]}>{label}</Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: typography.sizes.body, color: colors.textMuted },
  roles: { gap: spacing.md },
  role: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  roleSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  roleLabelSelected: { color: colors.primaryDark },
  roleDescription: { fontSize: typography.sizes.small, color: colors.textMuted },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
});
