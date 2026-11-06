import type { Locale } from "@fitmusc/shared/locale";
import { Image } from "expo-image";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AppText, Button } from "@/components/ui";
import { useSession } from "@/lib/session";
import { colors, radius, spacing } from "@/lib/theme";
import { openWebPage } from "@/lib/web-links";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const t = useTranslations("auth.login");
  const tm = useTranslations("mobile.signIn");
  const locale = useLocale() as Locale;
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return setError(t("errors.emailRequired"));
    if (!EMAIL_REGEX.test(trimmed)) return setError(t("errors.invalidEmail"));
    if (!password) return setError(t("errors.passwordRequired"));

    setError(null);
    setLoading(true);
    const result = await signIn(trimmed, password);
    setLoading(false);
    // On success the session changes and the root guard swaps this screen out.
    if (!result.ok) setError(t(`errors.${result.reason}`));
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require("@/assets/images/icon.png")} style={styles.logo} accessibilityIgnoresInvertColors />
          <AppText variant="title">FitMusc</AppText>
          <AppText variant="muted">{t("subtitle")}</AppText>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t("email")}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            accessibilityLabel={t("email")}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t("password")}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel={t("password")}
          />
          {error ? (
            <AppText style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <Button label={t("signIn")} onPress={submit} loading={loading} />
          <Button label={tm("openForgotPassword")} variant="ghost" onPress={() => openWebPage("forgotPassword", locale)} />
        </View>

        <AppText variant="small" style={styles.note}>
          {tm("webOnly")}
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xl },
  header: { alignItems: "center", gap: spacing.sm },
  logo: { width: 72, height: 72, borderRadius: radius.lg },
  form: { gap: spacing.md },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  error: { color: colors.danger },
  note: { textAlign: "center" },
});
