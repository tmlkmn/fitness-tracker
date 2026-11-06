import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { PlanTypeIcon } from "@/components/plan-type";
import { AppText, Banner, Card, ErrorView, LoadingView, Screen } from "@/components/ui";
import { useSharedWeek, useSharedWeekDays } from "@/hooks/sharing";
import { colors, spacing } from "@/lib/theme";

/** A week someone shared with the user, read-only (web: /paylasilan/hafta/[id]). */
export default function SharedWeekScreen() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const id = Number(useLocalSearchParams<{ weeklyPlanId: string }>().weeklyPlanId);
  const week = useSharedWeek(id);
  const days = useSharedWeekDays(id);

  if (week.isLoading || days.isLoading) return <LoadingView />;
  if (!week.data || !days.data) {
    return (
      <ErrorView
        error={week.error ?? days.error}
        onRetry={() => {
          void week.refetch();
          void days.refetch();
        }}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: week.data.title || t("sharing.weeklyTitleFallback") }} />
      <Screen
        refreshing={week.isRefetching || days.isRefetching}
        onRefresh={() => {
          void week.refetch();
          void days.refetch();
        }}
      >
        <AppText variant="muted">{t("sharing.sharedBy", { name: week.data.ownerName })}</AppText>
        <Banner icon={<Ionicons name="eye-outline" size={16} color={colors.warning} />}>{t("sharing.readOnlyNotice")}</Banner>
        {days.data.length === 0 ? <AppText variant="muted">{t("sharing.noDays")}</AppText> : null}
        {days.data.map((day) => (
          <Pressable
            key={day.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/shared/day/[dayId]", params: { dayId: String(day.id) } })}
          >
            {({ pressed }) => (
              <Card style={[styles.row, pressed && styles.pressed]}>
                <PlanTypeIcon planType={day.planType} size={20} />
                <View style={styles.grow}>
                  <AppText style={styles.title}>{day.dayName}</AppText>
                  {day.date ? (
                    <AppText variant="small">
                      {formatDate(parseDateOnly(day.date), locale, { weekday: "short", day: "numeric", month: "short" })}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="small" numberOfLines={1} style={styles.type}>
                  {day.workoutTitle ?? t(`dashboard.planTypes.${day.planType}`)}
                </AppText>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Card>
            )}
          </Pressable>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  title: { fontWeight: "600" },
  type: { maxWidth: 140 },
  pressed: { backgroundColor: colors.cardPressed },
});
