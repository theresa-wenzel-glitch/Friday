import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Category, ServiceRequest } from "@jobflow/types";
import { colors, spacing, typography } from "@jobflow/config";
import { api } from "../../lib/api.js";
import { useSession } from "../../lib/session.js";
import { Button } from "../../components/Button.js";
import { CategoryCard } from "../../components/CategoryCard.js";
import { RequestCard } from "../../components/RequestCard.js";
import { Screen } from "../../components/Screen.js";

/**
 * Screen 02 - Startseite des Kunden.
 *
 * Bewusst fast leer. Der wichtigste Weg ist "Problem beschreiben"; alles
 * andere darf davon nicht ablenken. Kategorien sind eine Abkuerzung fuer
 * Leute, die schon wissen, was sie brauchen - kein Pflichtweg.
 */
export default function HomeScreen() {
  const { user } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recent, setRecent] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    void api
      .get<Category[]>("/categories")
      .then((all) => setCategories(all.filter((category) => category.parentId === null)))
      .catch(() => setCategories([]));
  }, []);

  // Beim Zurueckkehren auf den Screen neu laden - sonst fehlt die gerade
  // erstellte Anfrage.
  useFocusEffect(
    useCallback(() => {
      void api
        .get<{ items: ServiceRequest[] }>("/requests?limit=3")
        .then((page) => setRecent(page.items))
        .catch(() => setRecent([]));
    }, []),
  );

  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <Screen>
      <View>
        <Text style={styles.greeting}>Hallo {firstName} 👋</Text>
        <Text style={styles.question}>Was brauchst du?</Text>
      </View>

      <Button icon="✍️" title="Problem beschreiben" onPress={() => router.push("/(app)/create-request")} />

      {recent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deine letzten Anfragen</Text>
          <View style={styles.list}>
            {recent.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onPress={(item) => router.push(`/(app)/requests/${item.id}`)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Beliebte Kategorien</Text>
        <View style={styles.grid}>
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onPress={(item) => router.push(`/(app)/create-request?categoryId=${item.id}`)}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: typography.sizes.body, color: colors.textMuted },
  question: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  list: { gap: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
});
