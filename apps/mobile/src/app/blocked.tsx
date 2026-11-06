import type { Locale } from "@fitmusc/shared/locale";
import { StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AppText, Button } from "@/components/ui";
import { useSession, type Blocked } from "@/lib/session";
import { colors, spacing } from "@/lib/theme";
import { openWebPage } from "@/lib/web-links";

// Access denial → its texts in the web's `auth` namespace.
const AUTH_KEY: Record<Exclude<Blocked, "MustChangePassword">, string> = {
  AccountFrozen: "accountFrozen",
  NotApproved: "pending",
  MembershipExpired: "membershipExpired",
  TrialExpired: "trialExpired",
};

/** Shown instead of the app while the account can't use it (status from a 403 or the session user). */
export default function BlockedScreen() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { blocked, retryAccess, signOut } = useSession();
  if (!blocked) return null;

  const mustChange = blocked === "MustChangePassword";
  // An expired trial or membership is renewed outside the app; the store rules
  // forbid pointing there (App Store 3.1.1), so the app only says it's inactive.
  const lapsed = blocked === "TrialExpired" || blocked === "MembershipExpired";
  const title = mustChange ? t("mobile.blocked.mustChangePasswordTitle") : t(`auth.${AUTH_KEY[blocked]}.title`);
  let description: string;
  if (blocked === "MustChangePassword") description = t("mobile.blocked.mustChangePasswordDescription");
  else if (lapsed) description = t("mobile.blocked.inactiveDescription");
  else description = t(`auth.${AUTH_KEY[blocked]}.description`);

  return (
    <View style={styles.container}>
      <View style={styles.text}>
        <AppText variant="title" style={styles.center}>
          {title}
        </AppText>
        <AppText variant="muted" style={styles.center}>
          {description}
        </AppText>
      </View>
      <View style={styles.actions}>
        {lapsed ? null : (
          <Button
            label={t("mobile.blocked.openWeb")}
            onPress={() => openWebPage(mustChange ? "changePassword" : "home", locale)}
          />
        )}
        <Button label={t("mobile.blocked.retry")} variant="secondary" onPress={retryAccess} />
        <Button label={t("nav.signOut")} variant="ghost" onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xxl, backgroundColor: colors.background },
  text: { gap: spacing.md },
  center: { textAlign: "center" },
  actions: { gap: spacing.md },
});
