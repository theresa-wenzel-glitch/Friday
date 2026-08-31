import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Match, ServiceRequest } from "@jobflow/types";
import { colors, spacing, typography } from "@jobflow/config";
import { api } from "../../../lib/api.js";
import { useSession } from "../../../lib/session.js";
import { Card } from "../../../components/Card.js";
import { RequestCard } from "../../../components/RequestCard.js";
import { Screen } from "../../../components/Screen.js";

/**
 * Die Anfragenliste.
 *
 * Für den Kunden: "Meine Anfragen". Für das Unternehmen: die Anfragen, die
 * ihm vorgeschlagen wurden. Zwei Sichten, ein Screen - die Daten kommen aus
 * unterschiedlichen Endpunkten, die Darstellung ist dieselbe.
 */
export default function RequestListScreen() {
  const { user } = useSession();
  const isBusiness = user?.role === "BUSINESS" || user?.role === "BUSINESS_EMPLOYEE";

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        try {
          if (isBusiness) {
            const found = await api.get<Match[]>("/businesses/me/matches");
            if (!cancelled) setMatches(found);
          } else {
            const page = await api.get<{ items: ServiceRequest[] }>("/requests?limit=50");
            if (!cancelled) setRequests(page.items);
          }
        } catch {
          if (!cancelled) {
            setRequests([]);
            setMatches([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isBusiness]),
  );

  if (loading) {
    return (
      <Screen scroll={false} style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isBusiness) {
    return (
      <Screen>
        <Text style={styles.title}>Neue Anfragen</Text>
        {matches.length === 0 ? (
          <Empty
            title="Noch keine Anfragen"
            hint="Sobald eine passende Anfrage in deiner Nähe entsteht, erscheint sie hier. Prüfe im Profil, ob deine Leistungen und dein Einsatzgebiet hinterlegt sind."
          />
        ) : (
          <View style={styles.list}>
            {matches.map((match) => (
              <Card
                key={match.id}
                onPress={() => router.push(`/(app)/requests/${match.requestId}`)}
                accessibilityLabel="Anfrage öffnen"
              >
                <Text style={styles.matchScore}>Passung {match.score} von 100</Text>
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
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Meine Anfragen</Text>
      {requests.length === 0 ? (
        <Empty
          title="Noch keine Anfragen"
          hint="Beschreibe dein Anliegen - JobFlow findet die passenden Anbieter."
        />
      ) : (
        <View style={styles.list}>
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onPress={(item) => router.push(`/(app)/requests/${item.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  list: { gap: spacing.md },
  matchScore: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  reasons: { gap: spacing.xs },
  reason: { fontSize: typography.sizes.small, color: colors.textMuted },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  emptyHint: {
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
