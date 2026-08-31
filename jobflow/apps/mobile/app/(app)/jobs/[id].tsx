import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Business, Job, Offer, Review, ServiceRequest } from "@jobflow/types";
import { colors, spacing, typography } from "@jobflow/config";
import { api, ApiClientError } from "../../../lib/api.js";
import { useSession } from "../../../lib/session.js";
import { Button } from "../../../components/Button.js";
import { Card } from "../../../components/Card.js";
import { ErrorNotice } from "../../../components/ErrorNotice.js";
import { Screen } from "../../../components/Screen.js";
import { StatusTimeline } from "../../../components/StatusTimeline.js";
import { formatEuro } from "../../../lib/format.js";

/**
 * Der Auftragsstatus.
 *
 * Zwischen Zusage und Termin liegen oft mehrere Tage. In dieser Zeit ist der
 * Zeitstrahl das Einzige, was dem Kunden zeigt, dass sein Anliegen laeuft -
 * deshalb steht er ganz oben.
 */
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const isBusiness = user?.role === "BUSINESS" || user?.role === "BUSINESS_EMPLOYEE";

  const [job, setJob] = useState<Job | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof id !== "string") return;
    try {
      const found = await api.get<Job>(`/jobs/${id}`);
      setJob(found);
      const [loadedOffer, loadedRequest, loadedBusiness] = await Promise.all([
        api.get<Offer>(`/offers/${found.offerId}`).catch(() => null),
        api.get<ServiceRequest>(`/requests/${found.requestId}`).catch(() => null),
        api.get<Business>(`/businesses/${found.businessId}`).catch(() => null),
      ]);
      setOffer(loadedOffer);
      setRequest(loadedRequest);
      setBusiness(loadedBusiness);

      // Ob bereits bewertet wurde, steht in den Bewertungen des Unternehmens.
      if (found.status === "COMPLETED") {
        const reviews = await api
          .get<Review[]>(`/businesses/${found.businessId}/reviews?limit=50`)
          .catch(() => [] as Review[]);
        setReview(reviews.find((entry) => entry.jobId === found.id) ?? null);
      }
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Diesen Auftrag gibt es nicht.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function setStatus(status: Job["status"]): Promise<void> {
    if (job === null) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.patch(`/jobs/${job.id}/status`, { status });
      await load();
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Das hat nicht geklappt.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen scroll={false} style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (job === null) {
    return (
      <Screen>
        <ErrorNotice message={message ?? "Diesen Auftrag gibt es nicht."} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={styles.title}>{request?.title ?? "Dein Auftrag"}</Text>
        <Text style={styles.meta}>
          {business?.name ?? ""}
          {offer === null ? "" : ` · ${formatEuro(offer.totalCents)}`}
        </Text>
      </View>

      <Card>
        <StatusTimeline status={request?.status ?? "ACCEPTED"} />
      </Card>

      {request !== null ? (
        <Card>
          <Text style={styles.sectionLabel}>Anliegen</Text>
          <Text style={styles.body}>{request.description}</Text>
        </Card>
      ) : null}

      <ErrorNotice message={message} />

      <Button
        title="Nachricht schreiben"
        icon="💬"
        variant="secondary"
        onPress={() => router.push("/(app)/chat")}
      />

      {/* Den Fortschritt meldet das ausführende Unternehmen - das ist seine
          Aussage, nicht die des Kunden. Das Backend erzwingt dieselbe Regel. */}
      {isBusiness && job.status === "SCHEDULED" ? (
        <Button title="Auftrag beginnen" loading={busy} onPress={() => setStatus("IN_PROGRESS")} />
      ) : null}
      {isBusiness && job.status === "IN_PROGRESS" ? (
        <Button title="Auftrag abschließen" loading={busy} onPress={() => setStatus("COMPLETED")} />
      ) : null}

      {!isBusiness && job.status === "COMPLETED" && review === null ? (
        <Button title="Auftrag bewerten" onPress={() => router.push(`/(app)/review?jobId=${job.id}`)} />
      ) : null}

      {review !== null ? (
        <Card>
          <Text style={styles.sectionLabel}>Deine Bewertung</Text>
          <Text style={styles.stars}>{"⭐".repeat(review.rating)}</Text>
          {review.text === null ? null : <Text style={styles.body}>{review.text}</Text>}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  meta: { fontSize: typography.sizes.small, color: colors.textMuted, marginTop: spacing.xs },
  sectionLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  body: { fontSize: typography.sizes.small, color: colors.text, lineHeight: 21 },
  stars: { fontSize: typography.sizes.title },
});
