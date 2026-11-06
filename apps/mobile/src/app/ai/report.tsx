import { useMutation } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useTranslations } from "use-intl";

import { Input } from "@/components/form";
import { AppText, Button, Card, Screen, useErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

const MAX_MESSAGE = 2000;

/**
 * Report AI-generated content as harmful, wrong or inappropriate (Google
 * Play's AI-generated content policy). Sent as feedback, so it reaches the
 * admins' feedback inbox together with the reported text.
 */
export default function AiReportScreen() {
  const t = useTranslations("mobile.aiReport");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const { context } = useLocalSearchParams<{ context?: string }>();
  const [note, setNote] = useState("");
  const send = useMutation({
    mutationFn: (message: string) => api("/feedback", { method: "POST", body: { category: "complaint", message } }),
  });

  const submit = () => {
    const header = `[AI] ${note.trim() || t("noNote")}`;
    const body = context ? `${header}\n---\n${context}` : header;
    send.mutate(body.slice(0, MAX_MESSAGE), {
      onSuccess: () => Alert.alert(t("sent"), undefined, [{ text: "OK", onPress: () => router.back() }]),
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <Screen>
        <AppText variant="muted">{t("hint")}</AppText>
        {context ? (
          <Card>
            <AppText variant="small">{t("reported")}</AppText>
            <AppText numberOfLines={8}>{context}</AppText>
          </Card>
        ) : null}
        <Input value={note} onChangeText={setNote} placeholder={t("placeholder")} multiline maxLength={500} />
        {send.error ? <AppText style={styles.error}>{errorMessage(send.error)}</AppText> : null}
        <Button label={t("send")} loading={send.isPending} onPress={submit} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, textAlign: "center" },
});
