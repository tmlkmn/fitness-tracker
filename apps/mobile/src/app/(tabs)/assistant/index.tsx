import Ionicons from "@expo/vector-icons/Ionicons";
import type { ChatMessageDto } from "@fitmusc/shared/api/dto";
import { useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslations } from "use-intl";

import { AiDisclaimer, ErrorBox, Markdown, QuotaBadge } from "@/components/ai";
import { AppText, Chip, ErrorView, LoadingView, useErrorMessage } from "@/components/ui";
import { aiKeys, useChatHistory, useClearChat, useInvalidateQuota, useQuota } from "@/hooks/ai";
import { useRequireAiConsent } from "@/hooks/ai-consent";
import { apiStream } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";

// The server keeps the last 12 messages (6 turns) of what is sent.
const CONTEXT_MESSAGES = 12;
const SUGGESTIONS = ["todayMeal", "kneeSquat", "weightLossSpeed", "waterIntake"] as const;

type Turn = { role: "user" | "assistant"; content: string };

/** The coach chat (web: /asistan). Replies stream in; the server stores both sides. */
export default function AssistantScreen() {
  const t = useTranslations("assistant");
  const tr = useTranslations();
  const qc = useQueryClient();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const headerHeight = useHeaderHeight();
  const history = useChatHistory();
  const clear = useClearChat();
  const quota = useQuota("chat");
  const invalidateQuota = useInvalidateQuota();
  const [draft, setDraft] = useState("");
  // The question being answered and the reply so far, until the history has both.
  const [pending, setPending] = useState<{ question: string; reply: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const messages = history.data ?? [];
  const exhausted = quota != null && quota.remaining <= 0;

  // Leaving the tab mid-answer stops the stream.
  useEffect(() => () => abort.current?.abort(), []);

  const requireConsent = useRequireAiConsent();
  const send = (text: string) => {
    if (!text.trim() || pending || exhausted) return;
    requireConsent(() => void ask(text));
  };
  const ask = async (text: string) => {
    const question = text.trim();
    setError(null);
    setDraft("");
    const all: Turn[] = messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    all.push({ role: "user", content: question });
    const turns = all.filter((m) => m.content.trim().length > 0).slice(-CONTEXT_MESSAGES);
    while (turns[0]?.role === "assistant") turns.shift();

    setPending({ question, reply: "" });
    const controller = new AbortController();
    abort.current = controller;
    try {
      const reply = await apiStream("/ai/chat", {
        body: { messages: turns },
        signal: controller.signal,
        onText: (reply) => setPending({ question, reply }),
      });
      const now = new Date().toISOString();
      qc.setQueryData<ChatMessageDto[]>(aiKeys.chat, (old) => [
        ...(old ?? []),
        { id: -Date.now(), role: "user", content: question, createdAt: now },
        { id: -Date.now() - 1, role: "assistant", content: reply, createdAt: now },
      ]);
    } catch (err) {
      // Stopped or failed mid-way: the server's copy is the truth (it stored the question).
      void qc.invalidateQueries({ queryKey: aiKeys.chat });
      if ((err as Error)?.name !== "AbortError") {
        setError(errorMessage(err));
        setDraft(question);
      }
    } finally {
      abort.current = null;
      setPending(null);
      invalidateQuota();
    }
  };

  const confirmClear = () =>
    Alert.alert(t("clearChat"), undefined, [
      { text: tr("common.cancel"), style: "cancel" },
      { text: t("clearChat"), style: "destructive", onPress: () => clear.mutate() },
    ]);

  if (history.isLoading) return <LoadingView />;
  if (history.error && !history.data) return <ErrorView error={history.error} onRetry={() => history.refetch()} />;

  const empty = messages.length === 0 && !pending;
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            messages.length > 0 && !pending ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t("clearChat")} hitSlop={10} onPress={confirmClear}>
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          ref={scroll}
          style={styles.screen}
          contentContainerStyle={[styles.content, empty && styles.contentEmpty]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          {empty ? (
            <View style={styles.intro}>
              <View style={styles.bot}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.primary} />
              </View>
              <AppText variant="heading">{t("appName")}</AppText>
              <AppText variant="muted" style={{ textAlign: "center" }}>
                {t("intro")}
              </AppText>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((key) => (
                  <Chip key={key} label={t(`suggestions.${key}`)} selected={false} onPress={() => void send(t(`suggestions.${key}`))} />
                ))}
              </View>
            </View>
          ) : null}
          {messages.map((m) => (
            <Bubble
              key={m.id}
              role={m.role === "user" ? "user" : "assistant"}
              content={m.content}
              // Long-press an answer to report it (Google Play's AI-generated content policy).
              onReport={() => router.push({ pathname: "/ai/report", params: { context: m.content.slice(0, 1500) } })}
            />
          ))}
          {pending ? (
            <>
              <Bubble role="user" content={pending.question} />
              <Bubble role="assistant" content={pending.reply} streaming />
            </>
          ) : null}
          {error ? <ErrorBox message={error} /> : null}
          {messages.length > 0 ? (
            <AiDisclaimer reportContext={messages.findLast((m) => m.role === "assistant")?.content} />
          ) : null}
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.inputBar}>
          <View style={styles.inputHead}>
            <QuotaBadge feature="chat" />
          </View>
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={exhausted ? t("input.limitReached") : t("input.placeholder")}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              editable={!exhausted}
              multiline
              maxLength={2000}
              style={styles.input}
            />
            {pending ? (
              <Pressable accessibilityRole="button" accessibilityLabel={tr("mobile.ai.stop")} onPress={() => abort.current?.abort()} style={styles.send}>
                <Ionicons name="stop" size={18} color={colors.primaryText} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr("mobile.ai.send")}
                disabled={!draft.trim() || exhausted}
                onPress={() => void send(draft)}
                style={[styles.send, (!draft.trim() || exhausted) && { opacity: 0.4 }]}
              >
                <Ionicons name="arrow-up" size={20} color={colors.primaryText} />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

function Bubble({
  role,
  content,
  streaming,
  onReport,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  onReport?: () => void;
}) {
  const t = useTranslations("mobile.aiReport");
  if (role === "user") {
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <Text style={styles.userText}>{content}</Text>
      </View>
    );
  }
  return (
    <Pressable
      onLongPress={onReport}
      disabled={!onReport}
      accessibilityHint={onReport ? t("longPressHint") : undefined}
      style={[styles.bubble, styles.botBubble]}
    >
      {content ? <Markdown>{content}</Markdown> : null}
      {streaming && !content ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  contentEmpty: { flexGrow: 1, justifyContent: "center" },
  intro: { alignItems: "center", gap: spacing.md },
  bot: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  suggestions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  bubble: { maxWidth: "88%", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  userBubble: { alignSelf: "flex-end", backgroundColor: colors.primary },
  userText: { color: colors.primaryText, fontSize: 15, lineHeight: 21 },
  botBubble: { alignSelf: "flex-start", backgroundColor: colors.card },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  inputHead: { flexDirection: "row", justifyContent: "flex-end", paddingBottom: spacing.xs },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingBottom: spacing.sm },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
