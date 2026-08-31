import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Business, Job, Offer } from "@jobflow/types";
import { colors, offerStatusLabels, spacing, typography } from "@jobflow/config";
import { api, ApiClientError } from "../../../lib/api.js";
import { useSession } from "../../../lib/session.js";
import { Badge } from "../../../components/Badge.js";
import { Button } from "../../../components/Button.js";
import { Card } from "../../../components/Card.js";
import { ErrorNotice } from "../../../components/ErrorNotice.js";
import { Screen } from "../../../components/Screen.js";
import { formatEuro } from "../../../lib/format.js";

/**
 * Das Angebot im Detail.
 *
 * Der Preis steht vollständig und aufgeschlüsselt da, bevor der Kunde
 * annimmt - Arbeit, Material, Anfahrt. Ein Marktplatz, auf dem erst nach der
 * Zusage klar wird, was etwas kostet, verspielt genau das Vertrauen, von dem
 * er lebt.
 */
export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const isCustomer = user?.role === "CUSTOMER";

  const [offer, setOffer] = useState<Offer | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof id !== "string") return;
    try {
      const found = await api.get<Offer>(`/offers/${id}`);
      setOffer(found);
      setBusiness(await api.get<Business>(`/businesses/${found.businessId}`));
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Dieses Angebot gibt es nicht.");
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

  async function accept(): Promise<void> {
    if (offer === null) return;
    setBusy(true);
    setMessage(null);
    try {
      // Die Antwort enthält den frisch angelegten Auftrag - der Kunde geht
      // direkt weiter zur Terminwahl.
      const result = await api.post<{ offer: Offer; job: Job }>(`/offers/${offer.id}/accept`);
      router.replace(`/(app)/appointment?offerId=${result.offer.id}`);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Das hat nicht geklappt.");
      setBusy(false);
    }
  }

  async function decline(): Promise<void> {
    if (offer === null) return;
    setBusy(true);
    try {
      await api.post(`/offers/${offer.id}/decline`);
      router.back();
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Das hat nicht geklappt.");
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

  if (offer === null) {
    return (
      <Screen>
        <ErrorNotice message={message ?? "Dieses Angebot gibt es nicht."} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={styles.title}>{business?.name ?? "Angebot"}</Text>
        <Text style={styles.meta}>
          {business == null || business.rating === null
            ? "Noch keine Bewertungen"
            : `⭐ ${business.rating.toFixed(1).replace(".", ",")} · ${business.reviewCount} Bewertungen`}
        </Text>
      </View>

      {business?.verified === true ? (
        <Badge label="Unternehmen geprüft" tone="success" />
      ) : (
        <Badge label="Noch nicht geprüft" tone="warning" />
      )}

      <Card>
        <View style={styles.line}>
          <Text style={styles.lineLabel}>Arbeitskosten</Text>
          <Text style={styles.lineValue}>{formatEuro(offer.laborCents)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.lineLabel}>Material</Text>
          <Text style={styles.lineValue}>{formatEuro(offer.materialCents)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.lineLabel}>Anfahrt</Text>
          <Text style={styles.lineValue}>{formatEuro(offer.travelCents)}</Text>
        </View>
        <View style={styles.total}>
          <Text style={styles.lineLabel}>Gesamt</Text>
          <Text style={styles.totalValue}>{formatEuro(offer.totalCents)}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Beschreibung</Text>
        <Text style={styles.body}>{offer.description}</Text>
        {offer.descriptionAiAssisted ? (
          <Text style={styles.aiHint}>
            Text mit KI-Unterstützung verfasst und vom Unternehmen freigegeben.
          </Text>
        ) : null}
      </Card>

      <View style={styles.statusRow}>
        <Badge
          label={offerStatusLabels[offer.status] ?? offer.status}
          tone={offer.status === "ACCEPTED" ? "success" : "neutral"}
        />
        <Text style={styles.meta}>Gültig bis {formatDate(offer.validUntil)}</Text>
      </View>

      <ErrorNotice message={message} />

      {isCustomer && offer.status === "PENDING" ? (
        <View style={styles.actions}>
          <Button title="Angebot annehmen" loading={busy} onPress={accept} />
          <Button title="Ablehnen" variant="ghost" onPress={decline} />
        </View>
      ) : offer.status === "ACCEPTED" ? (
        <Button
          title="Termin ansehen"
          variant="secondary"
          onPress={() => router.push(`/(app)/appointment?offerId=${offer.id}`)}
        />
      ) : null}
    </Screen>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  meta: { fontSize: typography.sizes.small, color: colors.textMuted },
  sectionLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  body: { fontSize: typography.sizes.small, color: colors.text, lineHeight: 21 },
  aiHint: { fontSize: typography.sizes.caption, color: colors.ai },
  line: { flexDirection: "row", justifyContent: "space-between" },
  lineLabel: { fontSize: typography.sizes.small, color: colors.textMuted },
  lineValue: { fontSize: typography.sizes.small, color: colors.text },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  totalValue: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actions: { gap: spacing.sm },
});
