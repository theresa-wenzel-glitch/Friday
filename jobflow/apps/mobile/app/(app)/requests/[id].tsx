import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type {
  AiAnalysisDetail,
  MatchWithBusiness,
  Offer,
  ServiceRequestDetail,
} from "@jobflow/types";
import { colors, offerStatusLabels, spacing, typography } from "@jobflow/config";
import { formatEuro } from "../../../lib/format.js";
import { api, ApiClientError } from "../../../lib/api.js";
import { useSession } from "../../../lib/session.js";
import { AiNotice } from "../../../components/AiNotice.js";
import { Badge } from "../../../components/Badge.js";
import { Button } from "../../../components/Button.js";
import { Card } from "../../../components/Card.js";
import { ErrorNotice } from "../../../components/ErrorNotice.js";
import { Input } from "../../../components/Input.js";
import { Screen } from "../../../components/Screen.js";
import { StatusTimeline } from "../../../components/StatusTimeline.js";

/**
 * Die Detailansicht einer Anfrage.
 *
 * Sie führt den Kunden durch den Ablauf: analysieren, Rückfragen
 * beantworten, Anbieter suchen, Angebot annehmen. Jeder Schritt ist genau
 * dann sichtbar, wenn er an der Reihe ist.
 */
export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const isCustomer = user?.role === "CUSTOMER";

  const [request, setRequest] = useState<ServiceRequestDetail | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysisDetail | null>(null);
  const [matches, setMatches] = useState<MatchWithBusiness[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof id !== "string") return;
    try {
      setRequest(await api.get<ServiceRequestDetail>(`/requests/${id}`));
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Anfrage nicht gefunden.");
      setLoading(false);
      return;
    }

    // Analyse, Vorschläge und Angebote gibt es noch nicht in jeder Phase -
    // ein 404 ist hier kein Fehler, sondern eine Auskunft.
    await Promise.all([
      api
        .get<AiAnalysisDetail>(`/requests/${id}/analysis`)
        .then(setAnalysis)
        .catch(() => setAnalysis(null)),
      isCustomer
        ? api
            .get<MatchWithBusiness[]>(`/requests/${id}/matches`)
            .then(setMatches)
            .catch(() => setMatches([]))
        : Promise.resolve(),
      isCustomer
        ? api
            .get<Offer[]>(`/requests/${id}/offers`)
            .then(setOffers)
            .catch(() => setOffers([]))
        : Promise.resolve(),
    ]);
    setLoading(false);
  }, [id, isCustomer]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function run(key: string, action: () => Promise<unknown>): Promise<void> {
    setMessage(null);
    setBusy(key);
    try {
      await action();
      await load();
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Das hat nicht geklappt.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <Screen scroll={false} style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (request === null) {
    return (
      <Screen>
        <ErrorNotice message={message ?? "Diese Anfrage gibt es nicht."} />
      </Screen>
    );
  }

  const openQuestions = analysis?.questions.filter((question) => question.answer === null) ?? [];

  return (
    <Screen>
      <Text style={styles.title}>{request.title ?? "Deine Anfrage"}</Text>
      <Text style={styles.description}>{request.description}</Text>

      <Card>
        <StatusTimeline status={request.status} />
      </Card>

      <ErrorNotice message={message} />

      {/* Schritt 1: analysieren lassen. */}
      {analysis === null && isCustomer ? (
        <Button
          icon="🤖"
          title="Von der KI analysieren lassen"
          loading={busy === "analyze"}
          onPress={() => run("analyze", () => api.post(`/requests/${request.id}/analyze`))}
        />
      ) : null}

      {analysis !== null ? (
        <AiNotice confidence={analysis.confidence}>
          <Text style={styles.aiSummary}>{analysis.summary}</Text>
        </AiNotice>
      ) : null}

      {/* Schritt 2: die wenigen offenen Rückfragen beantworten. */}
      {isCustomer && openQuestions.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>
            Noch {openQuestions.length} {openQuestions.length === 1 ? "Frage" : "Fragen"}
          </Text>
          <View style={styles.questions}>
            {openQuestions.map((question) => (
              <View key={question.id} style={styles.question}>
                <Input
                  label={question.question}
                  value={answers[question.id] ?? ""}
                  onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                  placeholder="Deine Antwort"
                />
                <Button
                  title="Antwort senden"
                  variant="secondary"
                  loading={busy === question.id}
                  onPress={() =>
                    run(question.id, () =>
                      api.post(`/requests/${request.id}/questions/${question.id}`, {
                        answer: answers[question.id] ?? "",
                      }),
                    )
                  }
                />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Schritt 3: passende Anbieter suchen. */}
      {isCustomer && matches.length === 0 && request.categoryId !== null ? (
        <Button
          icon="🔎"
          title="Passende Anbieter suchen"
          loading={busy === "match"}
          onPress={() => run("match", () => api.post(`/requests/${request.id}/matches`))}
        />
      ) : null}

      {matches.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {matches.length} {matches.length === 1 ? "passender Anbieter" : "passende Anbieter"}
          </Text>
          {matches.map((match) => (
            <Card key={match.id}>
              <View style={styles.businessHeader}>
                <Text style={styles.businessName}>{match.business.name}</Text>
                {match.business.verified ? <Badge label="Geprüft" tone="success" /> : null}
              </View>
              <Text style={styles.businessMeta}>
                {match.business.rating === null
                  ? "Noch keine Bewertungen"
                  : `⭐ ${match.business.rating.toFixed(1).replace(".", ",")} · ${match.business.reviewCount} Bewertungen`}
              </Text>
              <View style={styles.reasons}>
                {match.reasons.slice(0, 3).map((reason) => (
                  <Text key={reason.factor} style={styles.reason}>
                    • {reason.label}
                  </Text>
                ))}
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Schritt 4: Angebote vergleichen. Angenommen wird auf der Detailseite,
          wo der Preis vollständig aufgeschlüsselt steht. */}
      {offers.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {offers.length} {offers.length === 1 ? "Angebot" : "Angebote"} erhalten
          </Text>
          {offers.map((offer) => (
            <Card
              key={offer.id}
              onPress={() => router.push(`/(app)/offers/${offer.id}`)}
              accessibilityLabel="Angebot ansehen"
            >
              <View style={styles.offerHeader}>
                <Text style={styles.offerTotal}>{formatEuro(offer.totalCents)}</Text>
                <Badge
                  label={offerStatusLabels[offer.status] ?? offer.status}
                  tone={offer.status === "ACCEPTED" ? "success" : "neutral"}
                />
              </View>
              <Text style={styles.offerDescription} numberOfLines={2}>
                {offer.description}
              </Text>
              {offer.descriptionAiAssisted ? (
                <Text style={styles.aiHint}>Beschreibung mit KI-Unterstützung verfasst.</Text>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}

      {/* Die Sicht des Unternehmens: auf diese Anfrage antworten. */}
      {!isCustomer ? (
        <Button
          title="Angebot erstellen"
          loading={busy === "offer"}
          onPress={() => router.push(`/(app)/create-offer?requestId=${request.id}`)}
        />
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  description: { fontSize: typography.sizes.body, color: colors.textMuted, lineHeight: 24 },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  aiSummary: { fontSize: typography.sizes.body, color: colors.text },
  questions: { gap: spacing.lg },
  question: { gap: spacing.sm },
  businessHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  businessName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  businessMeta: { fontSize: typography.sizes.small, color: colors.textMuted, marginTop: spacing.xs },
  reasons: { gap: spacing.xs, marginTop: spacing.md },
  reason: { fontSize: typography.sizes.small, color: colors.textMuted },
  offerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  offerTotal: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  offerDescription: { fontSize: typography.sizes.small, color: colors.text, lineHeight: 20 },
  aiHint: { fontSize: typography.sizes.caption, color: colors.ai, marginTop: spacing.sm },
});
