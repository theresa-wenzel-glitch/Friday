import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { Review } from "@jobflow/types";
import { colors, spacing, typography } from "@jobflow/config";
import { createReviewSchema, validate } from "@jobflow/validation";
import { api, ApiClientError } from "../../lib/api.js";
import { Button } from "../../components/Button.js";
import { ErrorNotice } from "../../components/ErrorNotice.js";
import { Input } from "../../components/Input.js";
import { Screen } from "../../components/Screen.js";

/**
 * Bewertung nach Abschluss.
 *
 * Bewerten kann nur der Auftraggeber, nur einmal und nur nach Abschluss. Diese
 * Regel steht im Backend und in der Datenbank - hier wird sie nur abgebildet.
 */
export default function ReviewScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setMessage(null);
    const parsed = validate(createReviewSchema, {
      jobId,
      rating,
      text: text.trim() === "" ? null : text,
    });
    if (!parsed.ok) {
      setMessage("Bitte vergib zuerst eine Bewertung von 1 bis 5 Sternen.");
      return;
    }
    setBusy(true);
    try {
      await api.post<Review>("/reviews", parsed.value);
      router.replace(`/(app)/jobs/${String(jobId)}`);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Die Bewertung konnte nicht gesendet werden.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Wie war dein Auftrag?</Text>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => setRating(value)}
            accessibilityRole="radio"
            accessibilityLabel={`${value} von 5 Sternen`}
            accessibilityState={{ selected: rating === value }}
            style={styles.starButton}
          >
            <Text style={[styles.star, value <= rating ? styles.starOn : null]}>⭐</Text>
          </Pressable>
        ))}
      </View>

      <Input
        label="Was möchtest du sagen?"
        value={text}
        onChangeText={setText}
        placeholder="Sehr freundlicher und zuverlässiger Service."
        multiline
        hint="Freiwillig. Deine Bewertung ist öffentlich im Profil des Unternehmens sichtbar."
      />

      <ErrorNotice message={message} />
      <Button title="Bewertung senden" loading={busy} disabled={rating === 0} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  stars: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  starButton: { padding: spacing.xs },
  star: { fontSize: 38, opacity: 0.3 },
  starOn: { opacity: 1 },
});
