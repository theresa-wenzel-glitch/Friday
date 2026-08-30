import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Business, Match } from "@jobflow/types";
import { colors, spacing, typography } from "@jobflow/config";
import { api } from "../../lib/api.js";
import { Badge } from "../../components/Badge.js";
import { Card } from "../../components/Card.js";
import { Screen } from "../../components/Screen.js";

interface Statistics {
  matchCount: number;
  offerCount: number;
  jobCount: number;
  offerRate: number;
  winRate: number;
  avgResponseMinutes: number | null;
  rating: number | null;
  reviewCount: number;
}

/**
 * Das Dashboard eines Unternehmens.
 *
 * Es beantwortet die drei Fragen, die ein Betrieb morgens hat: Was ist neu?
 * Wie viele meiner Angebote werden angenommen? Wie schnell bin ich?
 */
export default function DashboardScreen() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const [profile, stats, newMatches] = await Promise.all([
            api.get<Business>("/businesses/me"),
            api.get<Statistics>("/businesses/me/statistics"),
            api.get<Match[]>("/businesses/me/matches?limit=5"),
          ]);
          if (cancelled) return;
          setBusiness(profile);
          setStatistics(stats);
          setMatches(newMatches);
        } catch {
          // Ohne Daten bleibt der Screen leer, statt abzustuerzen.
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading) {
    return (
      <Screen scroll={false} style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  const incomplete = business !== null && (business.latitude === null || business.description === null);

  return (
    <Screen>
      <View>
        <Text style={styles.greeting}>Guten Morgen 👋</Text>
        <Text style={styles.name}>{business?.name ?? "Dein Unternehmen"}</Text>
      </View>

      {incomplete ? (
        <Card style={styles.hint}>
          <Text style={styles.hintTitle}>Profil vervollstaendigen</Text>
          <Text style={styles.hintText}>
            Ohne Standort und Leistungen findet dich das Matching nicht. Beides laesst sich im Profil
            hinterlegen.
          </Text>
        </Card>
      ) : null}

      <View style={styles.tiles}>
        <Tile label="Neue Anfragen" value={String(statistics?.matchCount ?? 0)} />
        <Tile label="Angebote" value={String(statistics?.offerCount ?? 0)} />
        <Tile label="Auftraege" value={String(statistics?.jobCount ?? 0)} />
        <Tile label="Angebotsquote" value={`${statistics?.offerRate ?? 0} %`} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Kennzahlen</Text>
        <Metric
          label="Aus Angeboten werden Auftraege"
          value={`${statistics?.winRate ?? 0} %`}
        />
        <Metric
          label="Durchschnittliche Antwortzeit"
          value={
            statistics?.avgResponseMinutes == null
              ? "Noch keine Daten"
              : formatMinutes(statistics.avgResponseMinutes)
          }
        />
        <Metric
          label="Bewertung"
          value={
            statistics?.rating == null
              ? "Noch keine Bewertungen"
              : `${statistics.rating.toFixed(1).replace(".", ",")} aus ${statistics.reviewCount}`
          }
        />
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Neue Anfragen</Text>
        {matches.length === 0 ? (
          <Card>
            <Text style={styles.empty}>
              Zurzeit keine passenden Anfragen. Sobald eine entsteht, erscheint sie hier.
            </Text>
          </Card>
        ) : (
          matches.map((match) => (
            <Card
              key={match.id}
              onPress={() => router.push(`/(app)/requests/${match.requestId}`)}
              accessibilityLabel="Anfrage oeffnen"
            >
              <View style={styles.matchHeader}>
                <Text style={styles.matchScore}>Passung {match.score}</Text>
                {match.distanceKm !== null ? (
                  <Badge label={`${match.distanceKm.toFixed(1).replace(".", ",")} km`} />
                ) : null}
              </View>
              {match.reasons.slice(0, 2).map((reason) => (
                <Text key={reason.factor} style={styles.reason}>
                  • {reason.label}
                </Text>
              ))}
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatMinutes(minutes: number): string {
  return minutes < 60 ? `${minutes} Min.` : `${Math.round(minutes / 60)} Std.`;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  greeting: { fontSize: typography.sizes.body, color: colors.textMuted },
  name: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  hint: { backgroundColor: colors.warningLight, gap: spacing.xs },
  hintTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.warning,
  },
  hintText: { fontSize: typography.sizes.small, color: colors.text, lineHeight: 20 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { flexBasis: "47%", flexGrow: 1, gap: spacing.xs },
  tileValue: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  tileLabel: { fontSize: typography.sizes.caption, color: colors.textMuted },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metric: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  metricLabel: { fontSize: typography.sizes.small, color: colors.textMuted, flex: 1 },
  metricValue: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  matchHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  matchScore: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  reason: { fontSize: typography.sizes.small, color: colors.textMuted },
  empty: { fontSize: typography.sizes.small, color: colors.textMuted, lineHeight: 20 },
});
