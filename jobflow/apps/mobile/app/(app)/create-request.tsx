import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { ServiceRequest, Urgency } from "@jobflow/types";
import { colors, radii, spacing, typography, urgencyLabels } from "@jobflow/config";
import { createRequestSchema, REQUEST_DESCRIPTION_MIN, validate } from "@jobflow/validation";
import { api, ApiClientError } from "../../lib/api.js";
import { Button } from "../../components/Button.js";
import { ErrorNotice } from "../../components/ErrorNotice.js";
import { Input } from "../../components/Input.js";
import { Screen } from "../../components/Screen.js";

const URGENCY_OPTIONS: Urgency[] = ["LOW", "NORMAL", "HIGH"];

/**
 * Screen 03 - Anfrage erstellen.
 *
 * Ein Textfeld, ein Ort, ein Zeitrahmen. Kein 30-Felder-Formular: was noch
 * fehlt, fragt die KI im nächsten Schritt gezielt nach - und nur das, was
 * wirklich nötig ist.
 */
export default function CreateRequestScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();

  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("NORMAL");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setMessage(null);
    const parsed = validate(createRequestSchema, {
      description,
      urgency,
      locationLabel: locationLabel.trim() === "" ? null : locationLabel,
      categoryId: params.categoryId ?? null,
    });
    if (!parsed.ok) {
      setFields(parsed.fields);
      return;
    }
    setFields({});
    setBusy(true);
    try {
      const request = await api.post<ServiceRequest>("/requests", parsed.value);
      setDescription("");
      setLocationLabel("");
      router.replace(`/(app)/requests/${request.id}`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFields(error.fields);
        setMessage(error.message);
      } else {
        setMessage("Die Anfrage konnte nicht erstellt werden.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Was ist passiert?</Text>

      <Input
        label="Beschreibung"
        value={description}
        onChangeText={setDescription}
        placeholder="Meine Heizung wird nicht mehr richtig warm."
        multiline
        hint={`Ein bis zwei Sätze reichen. Mindestens ${REQUEST_DESCRIPTION_MIN} Zeichen.`}
        error={fields["description"]}
      />

      <Input
        label="Wo?"
        value={locationLabel}
        onChangeText={setLocationLabel}
        placeholder="45127 Essen"
        hint="Postleitzahl und Ort genügen. Die genaue Adresse bekommt nur das beauftragte Unternehmen."
        error={fields["locationLabel"]}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Wie dringend ist es?</Text>
        <View style={styles.options}>
          {URGENCY_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setUrgency(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: urgency === option }}
              style={[styles.option, urgency === option ? styles.optionSelected : null]}
            >
              <Text style={[styles.optionText, urgency === option ? styles.optionTextSelected : null]}>
                {urgencyLabels[option]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Fotos folgen in Phase 2 - der Upload braucht Object Storage und
          Zugriffsschutz, und ohne beides wäre er ein Sicherheitsproblem. */}

      <ErrorNotice message={message} />
      <Button title="Anfrage starten" onPress={submit} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  section: { gap: spacing.sm },
  label: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  options: { flexDirection: "row", gap: spacing.sm },
  option: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionText: { fontSize: typography.sizes.small, color: colors.textMuted },
  optionTextSelected: { color: colors.primaryDark, fontWeight: typography.weights.semibold },
});
