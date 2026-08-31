import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { colors, radii, spacing, typography } from "@jobflow/config";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.js";
import { Screen } from "../../components/Screen.js";
import { formatMinutes } from "../../lib/format.js";

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
 * Kennzahlen eines Unternehmens.
 *
 * Es geht nicht um möglichst viele Zahlen, sondern um die drei Fragen, die ein
 * Betrieb wirklich hat: Wie viele Anfragen bekomme ich? Wie viele davon
 * beantworte ich? Und wie viele werden zu Aufträgen?
 */
export default function StatisticsScreen() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void api
        .get<Statistics>("/businesses/me/statistics")
        .then((found) => {
          if (!cancelled) setStats(found);
        })
        .catch(() => {
          if (!cancelled) setStats(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
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

  const max = Math.max(stats?.matchCount ?? 0, 1);

  return (
    <Screen>
      <Text style={styles.title}>Statistik</Text>

      <Card>
        <Bar label="Anfragen" value={stats?.matchCount ?? 0} max={max} />
        <Bar label="Angebote" value={stats?.offerCount ?? 0} max={max} />
        <Bar label="Aufträge" value={stats?.jobCount ?? 0} max={max} />
      </Card>

      <View style={styles.tiles}>
        <Tile label="Angebotsquote" value={`${stats?.offerRate ?? 0} %`} />
        <Tile label="Aus Angebot wird Auftrag" value={`${stats?.winRate ?? 0} %`} />
        <Tile
          label="Antwortzeit im Schnitt"
          value={stats?.avgResponseMinutes == null ? "–" : formatMinutes(stats.avgResponseMinutes)}
        />
        <Tile
          label={stats?.reviewCount === 1 ? "aus 1 Bewertung" : `aus ${stats?.reviewCount ?? 0} Bewertungen`}
          value={stats?.rating == null ? "–" : stats.rating.toFixed(1).replace(".", ",")}
        />
      </View>

      <Card>
        <Text style={styles.sectionLabel}>Was das bedeutet</Text>
        <Text style={styles.body}>
          Die Antwortzeit fließt direkt ins Matching ein: Wer schneller antwortet, wird häufiger
          vorgeschlagen. Dasselbe gilt für abgeschlossene Aufträge und Bewertungen.
        </Text>
      </Card>
    </Screen>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <View style={styles.bar}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round((value / max) * 100)}%` }]} />
      </View>
    </View>
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

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  sectionLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  body: { fontSize: typography.sizes.small, color: colors.textMuted, lineHeight: 20 },
  bar: { gap: spacing.xs },
  barHead: { flexDirection: "row", justifyContent: "space-between" },
  barLabel: { fontSize: typography.sizes.small, color: colors.textMuted },
  barValue: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  barTrack: { height: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: radii.pill, backgroundColor: colors.primary },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { flexBasis: "47%", flexGrow: 1, gap: spacing.xs },
  tileValue: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  tileLabel: { fontSize: typography.sizes.caption, color: colors.textMuted },
});
