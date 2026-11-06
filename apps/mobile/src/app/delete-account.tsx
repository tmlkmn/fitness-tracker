import { useMutation } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useTranslations } from "use-intl";

import { Field, Input } from "@/components/form";
import { AppText, Button, Card, Screen, useErrorMessage } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

/**
 * Permanent account deletion inside the app (App Store 5.1.1(v), Google
 * Play's account deletion rule). Same flow as the web's data page: type the
 * account e-mail, the server cancels an active subscription, deletes the data
 * and ends every session.
 */
export default function DeleteAccountScreen() {
  const t = useTranslations("account.delete");
  const errorMessage = useErrorMessage();
  const { user, signOut } = useSession();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (confirmEmail: string) => api("/me/delete-account", { method: "POST", body: { confirmEmail } }),
  });
  const matches = Boolean(user?.email) && email.trim().toLowerCase() === user?.email.toLowerCase();

  const confirm = () =>
    Alert.alert(t("dialogTitle"), t("description"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("confirm"),
        style: "destructive",
        onPress: () => {
          setError(null);
          remove.mutate(email.trim(), {
            onSuccess: () => Alert.alert(t("success"), undefined, [{ text: "OK", onPress: () => void signOut() }]),
            onError: (err) => {
              if (err instanceof ApiRequestError && err.code === "EMAIL_MISMATCH") setError(t("errorMismatch"));
              else if (err instanceof ApiRequestError && err.code === "NETWORK") setError(errorMessage(err));
              else setError(t("errorGeneric"));
            },
          });
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <Screen>
        <Card>
          <AppText>{t("description")}</AppText>
          <AppText variant="muted">{t("dialogDescription")}</AppText>
          <Field label={t("confirmLabel")}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={user?.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="none"
            />
          </Field>
        </Card>
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button label={t("confirm")} variant="danger" disabled={!matches} loading={remove.isPending} onPress={confirm} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, textAlign: "center" },
});
