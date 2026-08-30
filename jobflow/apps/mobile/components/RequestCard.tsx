import { StyleSheet, Text, View } from "react-native";
import { colors, requestStatusLabels, spacing, typography, urgencyLabels } from "@jobflow/config";
import type { ServiceRequest } from "@jobflow/types";
import { Badge, type BadgeTone } from "./Badge.js";
import { Card } from "./Card.js";

interface Props {
  request: ServiceRequest;
  onPress: (request: ServiceRequest) => void;
}

/** Ton der Statusanzeige - der Fortschritt soll auf einen Blick erkennbar sein. */
function toneFor(status: ServiceRequest["status"]): BadgeTone {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "error";
    case "OFFERED":
    case "ACCEPTED":
      return "success";
    case "ANALYZING":
      return "ai";
    default:
      return "neutral";
  }
}

export function RequestCard({ request, onPress }: Props) {
  const title = request.title ?? request.description;

  return (
    <Card onPress={() => onPress(request)} accessibilityLabel={`Anfrage: ${title}`}>
      <View style={styles.header}>
        <Badge label={requestStatusLabels[request.status] ?? request.status} tone={toneFor(request.status)} />
        {request.urgency === "HIGH" ? <Badge label={urgencyLabels["HIGH"] as string} tone="warning" /> : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.meta}>
        {request.locationLabel ? <Text style={styles.metaText}>📍 {request.locationLabel}</Text> : null}
        <Text style={styles.metaText}>🕐 {formatDate(request.createdAt)}</Text>
      </View>
    </Card>
  );
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  meta: { flexDirection: "row", gap: spacing.lg, flexWrap: "wrap" },
  metaText: { fontSize: typography.sizes.caption, color: colors.textMuted },
});
