import Ionicons from "@expo/vector-icons/Ionicons";
import type { SharedWithMeDto, WeeklyPlanDto } from "@fitmusc/shared/api/dto";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AppText, Button, Card, ErrorView, LoadingView, Screen, SectionTitle } from "@/components/ui";
import { useMyShares, useSharedWithMe } from "@/hooks/sharing";
import { useWeeks } from "@/hooks/shopping";
import { isWeekPast, weekRangeLabel } from "@/lib/dates";
import { colors, radius, spacing } from "@/lib/theme";

/** Plans shared with the user (web: /paylasilan) and the user's own shares (web: ShareManager). */
export default function SharingScreen() {
  const t = useTranslations();
  const withMe = useSharedWithMe();
  const weeks = useWeeks();
  // Only weeks that haven't ended can be shared, like the web.
  const activeWeeks = (weeks.data ?? []).filter((w) => !w.startDate || !isWeekPast(w.startDate));

  return (
    <>
      <Stack.Screen options={{ title: t("mobile.sharing.title") }} />
      <Screen
        refreshing={withMe.isRefetching || weeks.isRefetching}
        onRefresh={() => {
          void withMe.refetch();
          void weeks.refetch();
        }}
      >
        <SectionTitle>{t("sharing.title")}</SectionTitle>
        {withMe.isLoading ? <LoadingView /> : null}
        {withMe.error && !withMe.data ? <ErrorView error={withMe.error} onRetry={() => withMe.refetch()} /> : null}
        {withMe.data?.length === 0 ? <AppText variant="muted">{t("sharing.empty")}</AppText> : null}
        {withMe.data?.map((plan) => <SharedPlanCard key={plan.shareId} plan={plan} />)}

        <SectionTitle>{t("shareManager.title")}</SectionTitle>
        {weeks.isLoading ? <LoadingView /> : null}
        {weeks.error && !weeks.data ? <ErrorView error={weeks.error} onRetry={() => weeks.refetch()} /> : null}
        {weeks.data && activeWeeks.length === 0 ? <AppText variant="muted">{t("shareManager.noActivePlans")}</AppText> : null}
        {activeWeeks.map((week) => (
          <MyWeekShares key={week.id} week={week} />
        ))}
      </Screen>
    </>
  );
}

function SharedPlanCard({ plan }: { plan: SharedWithMeDto }) {
  const t = useTranslations("sharing");
  const locale = useLocale() as Locale;
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/shared/week/[weeklyPlanId]", params: { weeklyPlanId: String(plan.weeklyPlanId) } })}
    >
      {({ pressed }) => (
        <Card style={pressed && styles.pressed}>
          <View style={styles.row}>
            <View style={styles.grow}>
              <AppText style={styles.title}>{plan.title}</AppText>
              <AppText variant="small">{t("weekLabel", { week: plan.weekNumber, phase: plan.phase })}</AppText>
              {plan.startDate ? <AppText variant="small">{weekRangeLabel(plan.startDate, locale)}</AppText> : null}
            </View>
            <View style={styles.pill}>
              <AppText style={styles.pillText} numberOfLines={1}>
                {plan.ownerName}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </Card>
      )}
    </Pressable>
  );
}

function MyWeekShares({ week }: { week: WeeklyPlanDto }) {
  const t = useTranslations("shareManager");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const shares = useMyShares(week.id);
  const names = shares.data?.map((s) => s.sharedWithName) ?? [];

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.grow}>
          <AppText style={styles.title}>{t("weekTitle", { week: week.weekNumber, title: week.title })}</AppText>
          {week.startDate ? <AppText variant="small">{weekRangeLabel(week.startDate, locale)}</AppText> : null}
        </View>
      </View>
      {shares.data ? <AppText variant="muted">{names.length > 0 ? names.join(", ") : t("notShared")}</AppText> : null}
      <Button
        icon="people-outline"
        label={t("shareButton")}
        variant="secondary"
        onPress={() => router.push({ pathname: "/share-week", params: { weeklyPlanId: String(week.id) } })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  title: { fontWeight: "600" },
  pressed: { backgroundColor: colors.cardPressed },
  pill: {
    maxWidth: 120,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.cardPressed,
  },
  pillText: { fontSize: 12 },
});
