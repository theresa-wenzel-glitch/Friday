import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { AiAnalysisDetail, Offer } from "@jobflow/types";
import { colors, radii, spacing, typography } from "@jobflow/config";
import { createOfferSchema, validate } from "@jobflow/validation";
import { api, ApiClientError } from "../../lib/api.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { ErrorNotice } from "../../components/ErrorNotice.js";
import { Input } from "../../components/Input.js";
import { Screen } from "../../components/Screen.js";
import { formatEuro } from "../../lib/format.js";

/**
 * Angebot erstellen.
 *
 * Die KI schlägt einen Beschreibungstext vor - über Preis und Inhalt
 * entscheidet ausschließlich das Unternehmen. Die Gesamtsumme rechnet das
 * Backend aus den drei Positionen; hier wird sie nur zur Kontrolle angezeigt.
 */
export default function CreateOfferScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const [labor, setLabor] = useState("80");
  const [material, setMaterial] = useState("25");
  const [travel, setTravel] = useState("15");
  const [description, setDescription] = useState("");
  const [aiAssisted, setAiAssisted] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (typeof requestId !== "string") return;
      void api
        .get<AiAnalysisDetail>(`/requests/${requestId}/analysis`)
        .then((analysis) => setSummary(analysis.summary))
        .catch(() => setSummary(null));
    }, [requestId]),
  );

  const totalCents = toCents(labor) + toCents(material) + toCents(travel);

  async function suggest(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.post<{ text: string }>("/offers/suggest-text", {
        context: summary ?? "Reparatur beim Kunden vor Ort",
      });
      setDescription(result.text);
      setAiAssisted(true);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Kein Vorschlag möglich.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(): Promise<void> {
    setMessage(null);
    // Ein Angebot gilt eine Woche - lang genug zum Vergleichen, kurz genug,
    // dass der Betrieb seine Preise nicht monatelang gebunden hat.
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const parsed = validate(createOfferSchema, {
      requestId,
      laborCents: toCents(labor),
      materialCents: toCents(material),
      travelCents: toCents(travel),
      description,
      validUntil,
      descriptionAiAssisted: aiAssisted,
    });
    if (!parsed.ok) {
      setFields(parsed.fields);
      return;
    }
    setFields({});
    setBusy(true);
    try {
      await api.post<Offer>("/offers", parsed.value);
      router.replace("/(app)/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFields(error.fields);
        setMessage(error.message);
      } else {
        setMessage("Das Angebot konnte nicht gesendet werden.");
      }
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Angebot erstellen</Text>

      {summary !== null ? (
        <Card style={styles.ai}>
          <Text style={styles.aiLabel}>🤖 Das Anliegen laut KI</Text>
          <Text style={styles.body}>{summary}</Text>
        </Card>
      ) : null}

      <Input
        label="Arbeitskosten in Euro"
        value={labor}
        onChangeText={setLabor}
        keyboardType="decimal-pad"
        error={fields["laborCents"]}
      />
      <Input
        label="Material in Euro"
        value={material}
        onChangeText={setMaterial}
        keyboardType="decimal-pad"
        error={fields["materialCents"]}
      />
      <Input
        label="Anfahrt in Euro"
        value={travel}
        onChangeText={setTravel}
        keyboardType="decimal-pad"
        error={fields["travelCents"]}
      />

      <View style={styles.total}>
        <Text style={styles.totalLabel}>Gesamt</Text>
        <Text style={styles.totalValue}>{formatEuro(totalCents)}</Text>
      </View>

      <Input
        label="Beschreibung"
        value={description}
        onChangeText={(value) => {
          setDescription(value);
          if (value.trim() === "") setAiAssisted(false);
        }}
        placeholder="Was ist im Angebot enthalten?"
        multiline
        error={fields["description"]}
        {...(aiAssisted ? { hint: "Vorschlag der KI – du kannst ihn frei ändern." } : {})}
      />

      <Button title="KI-Text vorschlagen" icon="🤖" variant="secondary" onPress={suggest} />

      <ErrorNotice message={message} />
      <Button title="Angebot senden" loading={busy} onPress={submit} />
    </Screen>
  );
}

/** "80" oder "80,50" -> Cent. Gerechnet wird immer in Cent. */
function toCents(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}

const styles = StyleSheet.create({
  title: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  ai: { backgroundColor: colors.aiLight },
  aiLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.ai,
  },
  body: { fontSize: typography.sizes.small, color: colors.text, lineHeight: 21 },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  totalLabel: { fontSize: typography.sizes.small, color: colors.primaryDark },
  totalValue: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
});
