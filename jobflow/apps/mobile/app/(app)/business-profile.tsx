import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { AvailabilitySlot, Business, BusinessService, Category } from "@jobflow/types";
import { colors, spacing, typography } from "@jobflow/config";
import { api, ApiClientError } from "../../lib/api.js";
import { Badge } from "../../components/Badge.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { ErrorNotice } from "../../components/ErrorNotice.js";
import { Input } from "../../components/Input.js";
import { Screen } from "../../components/Screen.js";
import { useSession } from "../../lib/session.js";

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/**
 * Unternehmensprofil.
 *
 * Ohne Standort und ohne hinterlegte Leistung findet das Matching den Betrieb
 * nicht - deshalb steht dieser Hinweis oben und nicht im Kleingedruckten.
 */
export default function BusinessProfileScreen() {
  const { signOut } = useSession();

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<BusinessService[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [radius, setRadius] = useState("30");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [profile, ownServices, slots, allCategories] = await Promise.all([
        api.get<Business>("/businesses/me"),
        api.get<BusinessService[]>("/businesses/me/services").catch(() => [] as BusinessService[]),
        api.get<AvailabilitySlot[]>("/businesses/me/availability").catch(() => [] as AvailabilitySlot[]),
        api.get<Category[]>("/categories").catch(() => [] as Category[]),
      ]);
      setBusiness(profile);
      setServices(ownServices);
      setAvailability(slots);
      setCategories(allCategories);
      setRadius(String(profile.serviceRadiusKm));
      setDescription(profile.description ?? "");
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Profil konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function save(): Promise<void> {
    if (business === null) return;
    setBusy(true);
    setMessage(null);
    try {
      const updated = await api.patch<Business>("/businesses/me", {
        name: business.name,
        description: description.trim() === "" ? null : description,
        latitude: business.latitude,
        longitude: business.longitude,
        serviceRadiusKm: Number(radius) || 30,
      });
      setBusiness(updated);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Speichern fehlgeschlagen.");
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

  const categoryName = (id: string): string =>
    categories.find((category) => category.id === id)?.name ?? "Leistung";

  const incomplete = business !== null && (business.latitude === null || services.length === 0);

  return (
    <Screen>
      <Text style={styles.title}>Unternehmen</Text>

      {incomplete ? (
        <Card style={styles.warn}>
          <Text style={styles.warnTitle}>Profil unvollständig</Text>
          <Text style={styles.body}>
            {business?.latitude === null
              ? "Ohne Standort kann das Matching die Entfernung nicht berechnen."
              : "Ohne hinterlegte Leistung wirst du zu keiner Anfrage vorgeschlagen."}
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.row}>
          <Text style={styles.name}>{business?.name ?? ""}</Text>
          {business?.verified === true ? <Badge label="Geprüft" tone="success" /> : null}
        </View>
        <Text style={styles.meta}>
          {business?.rating == null
            ? "Noch keine Bewertungen"
            : `⭐ ${business.rating.toFixed(1).replace(".", ",")} · ${business.reviewCount} Bewertungen`}
        </Text>
      </Card>

      <Input
        label="Beschreibung"
        value={description}
        onChangeText={setDescription}
        placeholder="Was macht euer Betrieb?"
        multiline
      />
      <Input
        label="Einsatzradius in Kilometern"
        value={radius}
        onChangeText={setRadius}
        keyboardType="number-pad"
        hint="Anfragen außerhalb dieses Radius werden dir nicht vorgeschlagen."
      />

      <ErrorNotice message={message} />
      <Button title="Speichern" loading={busy} onPress={save} />

      <Card>
        <Text style={styles.sectionLabel}>Leistungen</Text>
        {services.length === 0 ? (
          <Text style={styles.body}>Noch keine Leistung hinterlegt.</Text>
        ) : (
          <View style={styles.chips}>
            {services.map((service) => (
              <Badge key={service.id} label={categoryName(service.categoryId)} tone="neutral" />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Verfügbarkeit</Text>
        {availability.length === 0 ? (
          <Text style={styles.body}>
            Noch keine Zeiten hinterlegt. Kunden können dann keinen Termin buchen.
          </Text>
        ) : (
          availability.map((slot) => (
            <View key={slot.id} style={styles.row}>
              <Text style={styles.meta}>{WEEKDAYS[slot.weekday]}</Text>
              <Text style={styles.body}>
                {slot.startTime}–{slot.endTime}
              </Text>
            </View>
          ))
        )}
        <Text style={styles.hint}>Der Kunde sieht ausschließlich diese Zeiten.</Text>
      </Card>

      <Button
        title="Abmelden"
        variant="secondary"
        onPress={() => {
          void signOut().then(() => router.replace("/"));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  name: { fontSize: typography.sizes.title, fontWeight: typography.weights.semibold, color: colors.text },
  meta: { fontSize: typography.sizes.small, color: colors.textMuted },
  sectionLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  body: { fontSize: typography.sizes.small, color: colors.text, lineHeight: 20 },
  hint: { fontSize: typography.sizes.caption, color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  warn: { backgroundColor: colors.warningLight },
  warnTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.warning,
  },
});
