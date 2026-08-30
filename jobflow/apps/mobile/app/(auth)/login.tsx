import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import type { AuthResult } from "@jobflow/types";
import { colors, typography } from "@jobflow/config";
import { loginSchema, validate } from "@jobflow/validation";
import { api, ApiClientError } from "../../lib/api.js";
import { useSession } from "../../lib/session.js";
import { Button } from "../../components/Button.js";
import { ErrorNotice } from "../../components/ErrorNotice.js";
import { Input } from "../../components/Input.js";
import { Screen } from "../../components/Screen.js";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setMessage(null);
    const parsed = validate(loginSchema, { email, password });
    if (!parsed.ok) {
      setFields(parsed.fields);
      return;
    }
    setFields({});
    setBusy(true);
    try {
      const result = await api.post<AuthResult>("/auth/login", parsed.value);
      await signIn(result);
      router.replace(result.user.role === "CUSTOMER" ? "/(app)/home" : "/(app)/dashboard");
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Input
        label="E-Mail"
        value={email}
        onChangeText={setEmail}
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
        error={fields["password"]}
      />

      <ErrorNotice message={message} />
      <Button title="Anmelden" onPress={submit} loading={busy} />

      <Pressable onPress={() => router.replace("/(auth)/register")} accessibilityRole="link">
        <Text style={styles.link}>Noch kein Konto? Jetzt erstellen</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
});
