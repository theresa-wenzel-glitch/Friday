import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Appointment, Job } from "@jobflow/types";
import { colors, jobStatusLabels, spacing, typography } from "@jobflow/config";
import { api } from "../../../lib/api.js";
import { useSession } from "../../../lib/session.js";
import { Badge, type BadgeTone } from "../../../components/Badge.js";
import { Card } from "../../../components/Card.js";
import { Screen } from "../../../components/Screen.js";

function toneFor(status: Job["status"]): BadgeTone {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "error";
  if (status === "IN_PROGRESS") return "warning";
  return "neutral";
}

/** Alle Aufträge - für Kunden wie für Unternehmen dieselbe Liste. */
export default function JobListScreen() {
  const { user } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void api
        .get<Job[]>("/jobs?limit=50")
        .then((found) => {
          if (!cancelled) setJobs(found);
        })
        .catch(() => {
          if (!cancelled) setJobs([]);
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

  return (
    <Screen>
      <Text style={styles.title}>Aufträge</Text>
      {jobs.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>Noch keine Aufträge</Text>
          <Text style={styles.emptyHint}>
            {user?.role === "CUSTOMER"
              ? "Sobald du ein Angebot annimmst, entsteht hier ein Auftrag."
              : "Sobald ein Kunde eines deiner Angebote annimmt, erscheint der Auftrag hier."}
          </Text>
        </Card>
      ) : (
        jobs.map((job) => (
          <Card
            key={job.id}
            onPress={() => router.push(`/(app)/jobs/${job.id}`)}
            accessibilityLabel="Auftrag öffnen"
          >
            <View style={styles.header}>
              <Badge label={jobStatusLabels[job.status] ?? job.status} tone={toneFor(job.status)} />
            </View>
            <Text style={styles.meta}>
              Angelegt am{" "}
              {new Date(job.createdAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

export type { Appointment };

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  header: { flexDirection: "row", gap: spacing.sm },
  meta: { fontSize: typography.sizes.small, color: colors.textMuted },
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
