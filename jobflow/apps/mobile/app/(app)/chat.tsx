import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Conversation, Message } from "@jobflow/types";
import { colors, radii, spacing, typography } from "@jobflow/config";
import { api, ApiClientError } from "../../lib/api.js";
import { useSession } from "../../lib/session.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { ErrorNotice } from "../../components/ErrorNotice.js";
import { Input } from "../../components/Input.js";
import { Screen } from "../../components/Screen.js";

/**
 * Der Chat.
 *
 * Jede Anfrage-Unternehmen-Beziehung hat genau eine Konversation. Die KI kann
 * eine Antwort vorschlagen, aber niemals selbst absenden - und ein Text, der
 * von ihr stammt, ist auch nach dem Absenden als solcher gekennzeichnet.
 */
export default function ChatScreen() {
  const { user } = useSession();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [draftIsAi, setDraftIsAi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async (conversationId: string) => {
    const found = await api.get<Message[]>(`/conversations/${conversationId}/messages?limit=100`);
    setMessages(found);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        try {
          const found = await api.get<Conversation[]>("/conversations");
          if (cancelled) return;
          setConversations(found);
          const first = found[0];
          if (first !== undefined) {
            setActiveId(first.id);
            await loadMessages(first.id);
          }
        } catch {
          if (!cancelled) setConversations([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loadMessages]),
  );

  async function send(): Promise<void> {
    if (activeId === null || draft.trim() === "") return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`/conversations/${activeId}/messages`, {
        body: draft.trim(),
        isAiGenerated: draftIsAi,
      });
      setDraft("");
      setDraftIsAi(false);
      await loadMessages(activeId);
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Die Nachricht konnte nicht gesendet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function suggest(): Promise<void> {
    if (activeId === null) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.post<{ text: string }>(`/conversations/${activeId}/suggest-reply`, {
        context: messages.at(-1)?.body ?? "Rückfrage des Kunden",
      });
      setDraft(result.text);
      // Der Vorschlag bleibt als KI-Text markiert, auch wenn er noch bearbeitet
      // wird - die Kennzeichnung geht mit an den Empfänger.
      setDraftIsAi(true);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Kein Vorschlag möglich.");
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

  if (conversations.length === 0) {
    return (
      <Screen>
        <Text style={styles.title}>Nachrichten</Text>
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>Noch keine Gespräche</Text>
          <Text style={styles.emptyHint}>
            {user?.role === "CUSTOMER"
              ? "Sobald ein Unternehmen dir ein Angebot schickt, könnt ihr hier schreiben."
              : "Sobald du auf eine Anfrage antwortest, entsteht hier ein Gespräch."}
          </Text>
        </Card>
      </Screen>
    );
  }

  const isBusiness = user?.role === "BUSINESS" || user?.role === "BUSINESS_EMPLOYEE";

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Nachrichten</Text>

      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((entry) => {
          const mine = entry.senderId === user?.id;
          return (
            <View
              key={entry.id}
              style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
            >
              <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : null]}>{entry.body}</Text>
              <Text style={[styles.bubbleMeta, mine ? styles.bubbleMetaMine : null]}>
                {new Date(entry.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                {entry.isAiGenerated ? " · mit KI verfasst" : ""}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <ErrorNotice message={message} />

      {isBusiness ? (
        <Button title="Antwort vorschlagen" icon="🤖" variant="secondary" onPress={suggest} />
      ) : null}

      <View style={styles.composer}>
        <View style={styles.composerInput}>
          <Input
            label="Nachricht"
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              if (value.trim() === "") setDraftIsAi(false);
            }}
            placeholder="Nachricht schreiben"
          />
        </View>
        <Button title="Senden" loading={busy} onPress={send} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  thread: { flex: 1 },
  threadContent: { gap: spacing.sm, paddingVertical: spacing.sm },
  bubble: { maxWidth: "80%", padding: spacing.md, borderRadius: radii.lg },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.sm,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.sm,
  },
  bubbleText: { fontSize: typography.sizes.small, color: colors.text, lineHeight: 20 },
  bubbleTextMine: { color: colors.textInverted },
  bubbleMeta: { fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: spacing.xs },
  bubbleMetaMine: { color: colors.primaryLight },
  composer: { gap: spacing.sm },
  composerInput: { flex: 1 },
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
