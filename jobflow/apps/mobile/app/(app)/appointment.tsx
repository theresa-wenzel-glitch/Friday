import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { AvailableSlot, Offer } from "@jobflow/types";
import { colors, radii, spacing, typography } from "@jobflow/config";
import { api, ApiClientError } from "../../lib/api.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { ErrorNotice } from "../../components/ErrorNotice.js";
import { Screen } from "../../components/Screen.js";

/**
 * Terminwahl.
 *
 * Der Kunde sieht ausschließlich Zeitfenster, die das Unternehmen freigegeben
 * hat und die nicht bereits belegt sind. Die Berechnung dieser Fenster liegt im
 * Backend - die App zeigt nur, was sie bekommt, und erfindet keine Termine.
 */
export default function AppointmentScreen() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<AvailableSlot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        if (typeof offerId !== "string") return;
        try {
          const found = await api.get<Offer>(`/offers/${offerId}`);
          if (cancelled) return;
          setOffer(found);
          const available = await api.get<AvailableSlot[]>(`/businesses/${found.businessId}/availability`);
          if (!cancelled) setSlots(available);
        } catch (error) {
          if (!cancelled) {
            setMessage(error instanceof ApiClientError ? error.message : "Termine konnten nicht geladen werden.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [offerId]),
  );

  /** Die freien Fenster nach Tagen gruppieren - so wählt man einen Termin. */
  const byDay = useMemo(() => {
    const groups = new Map<string, AvailableSlot[]>();
    for (const slot of slots) {
      const key = slot.startTime.slice(0, 10);
      const list = groups.get(key);
      if (list === undefined) groups.set(key, [slot]);
      else list.push(slot);
    }
    return groups;
  }, [slots]);

  const days = useMemo(() => [...byDay.keys()].sort(), [byDay]);

  async function confirm(): Promise<void> {
    if (offer === null || selected === null) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post("/appointments", {
        offerId: offer.id,
        startTime: selected.startTime,
        endTime: selected.endTime,
      });
      router.replace("/(app)/jobs");
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Der Termin konnte nicht gebucht werden.");
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

  return (
    <Screen>
      <Text style={styles.title}>Termin auswählen</Text>

      {days.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>Keine freien Zeiten</Text>
          <Text style={styles.emptyHint}>
            Das Unternehmen hat für die nächsten drei Wochen nichts freigegeben. Schreib ihm eine
            Nachricht, um einen Termin abzustimmen.
          </Text>
          <Button title="Nachricht schreiben" variant="secondary" onPress={() => router.push("/(app)/chat")} />
        </Card>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Tag</Text>
            <View style={styles.days}>
              {days.slice(0, 12).map((day) => (
                <Pressable
                  key={day}
                  onPress={() => {
                    setSelectedDay(day);
                    setSelected(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedDay === day }}
                  style={[styles.day, selectedDay === day ? styles.daySelected : null]}
                >
                  <Text style={[styles.dayWeekday, selectedDay === day ? styles.daySelectedText : null]}>
                    {new Date(day).toLocaleDateString("de-DE", { weekday: "short" })}
                  </Text>
                  <Text style={[styles.dayNumber, selectedDay === day ? styles.daySelectedText : null]}>
                    {new Date(day).getDate()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {selectedDay !== null ? (
            <View style={styles.section}>
              <Text style={styles.label}>Verfügbare Zeiten</Text>
              <View style={styles.slots}>
                {(byDay.get(selectedDay) ?? []).map((slot) => (
                  <Pressable
                    key={slot.startTime}
                    onPress={() => setSelected(slot)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selected?.startTime === slot.startTime }}
                    style={[styles.slot, selected?.startTime === slot.startTime ? styles.slotSelected : null]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        selected?.startTime === slot.startTime ? styles.daySelectedText : null,
                      ]}
                    >
                      {new Date(slot.startTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.hint}>Wähle zuerst einen Tag.</Text>
          )}
        </>
      )}

      <ErrorNotice message={message} />
      {days.length > 0 ? (
        <Button title="Termin bestätigen" loading={busy} disabled={selected === null} onPress={confirm} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  section: { gap: spacing.sm },
  label: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  days: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  day: {
    width: 60,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: 2,
  },
  daySelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  daySelectedText: { color: colors.primaryDark },
  dayWeekday: { fontSize: typography.sizes.caption, color: colors.textMuted },
  dayNumber: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slot: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slotSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  slotText: { fontSize: typography.sizes.body, color: colors.text },
  hint: { fontSize: typography.sizes.small, color: colors.textMuted },
  empty: { gap: spacing.md },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  emptyHint: { fontSize: typography.sizes.small, color: colors.textMuted, lineHeight: 20 },
});
