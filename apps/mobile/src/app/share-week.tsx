import Ionicons from "@expo/vector-icons/Ionicons";
import type { PlanShareDto, WeeklyPlanDto } from "@fitmusc/shared/api/dto";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AppText, Banner, Card, ErrorView, LoadingView, Screen, SectionTitle, useErrorMessage } from "@/components/ui";
import { useMyShares, useRevokeShare, useShareableUsers, useShareWeek } from "@/hooks/sharing";
import { useWeeks } from "@/hooks/shopping";
import { ApiRequestError } from "@/lib/api";
import { isWeekPast, weekRangeLabel } from "@/lib/dates";
import { colors, spacing } from "@/lib/theme";

/** Share one of the user's weeks read-only, or stop sharing it (web: ShareDialog + ShareManager). */
export default function ShareWeekScreen() {
  const t = useTranslations("shareManager");
  const weeklyPlanId = Number(useLocalSearchParams<{ weeklyPlanId: string }>().weeklyPlanId);
  const weeks = useWeeks();
  const week = weeks.data?.find((w) => w.id === weeklyPlanId);

  if (weeks.isLoading) return <LoadingView />;
  if (!week) return <ErrorView error={weeks.error} onRetry={() => weeks.refetch()} />;
  return (
    <>
      <Stack.Screen options={{ title: t("shareButton") }} />
      <ShareWeek week={week} />
    </>
  );
}

function ShareWeek({ week }: { week: WeeklyPlanDto }) {
  const t = useTranslations();
  const ts = useTranslations("shareManager");
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const shares = useMyShares(week.id);
  const users = useShareableUsers();
  const share = useShareWeek(week.id);
  const revoke = useRevokeShare(week.id);
  const [error, setError] = useState<string | null>(null);
  const past = week.startDate ? isWeekPast(week.startDate) : false;

  const shareError = (err: unknown) => {
    if (err instanceof ApiRequestError && err.code === "PAST_WEEK") return t("mobile.sharing.pastWeek");
    if (err instanceof ApiRequestError && err.code === "ALREADY_SHARED") return t("mobile.sharing.alreadyShared");
    return errorMessage(err);
  };

  const confirmRevoke = (item: PlanShareDto) =>
    Alert.alert(t("mobile.sharing.revoke"), t("mobile.sharing.revokeConfirm", { name: item.sharedWithName }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("mobile.sharing.revoke"),
        style: "destructive",
        onPress: () => {
          setError(null);
          revoke.mutate(item.id, { onError: (err) => setError(errorMessage(err)) });
        },
      },
    ]);

  const sharedIds = new Set(shares.data?.map((s) => s.sharedWithUserId));
  const available = users.data?.filter((u) => !sharedIds.has(u.id)) ?? [];
  const busy = share.isPending || revoke.isPending;

  return (
    <Screen
      refreshing={shares.isRefetching}
      onRefresh={() => {
        void shares.refetch();
        void users.refetch();
      }}
    >
      <Card>
        <AppText variant="heading">{ts("weekTitle", { week: week.weekNumber, title: week.title })}</AppText>
        {week.startDate ? <AppText variant="muted">{weekRangeLabel(week.startDate, locale)}</AppText> : null}
      </Card>
      {past ? <Banner icon={<Ionicons name="lock-closed" size={14} color={colors.warning} />}>{t("mobile.sharing.pastWeek")}</Banner> : null}
      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      <SectionTitle>{t("mobile.sharing.sharedWith")}</SectionTitle>
      {shares.isLoading ? <LoadingView /> : null}
      {shares.error && !shares.data ? <ErrorView error={shares.error} onRetry={() => shares.refetch()} /> : null}
      {shares.data?.length === 0 ? <AppText variant="muted">{ts("notShared")}</AppText> : null}
      {shares.data?.map((item) => (
        <PersonRow
          key={item.id}
          name={item.sharedWithName}
          email={item.sharedWithEmail}
          icon="close-circle-outline"
          iconColor={colors.danger}
          label={`${t("mobile.sharing.revoke")}: ${item.sharedWithName}`}
          disabled={busy}
          onPress={() => confirmRevoke(item)}
        />
      ))}

      {past ? null : (
        <>
          <SectionTitle>{ts("pickUserTitle")}</SectionTitle>
          {users.isLoading ? <LoadingView /> : null}
          {users.error && !users.data ? <ErrorView error={users.error} onRetry={() => users.refetch()} /> : null}
          {users.data && available.length === 0 ? <AppText variant="muted">{ts("noUsers")}</AppText> : null}
          {available.map((user) => (
            <PersonRow
              key={user.id}
              name={user.name}
              email={user.email}
              icon="person-add-outline"
              iconColor={colors.primary}
              label={`${ts("shareButton")}: ${user.name}`}
              disabled={busy}
              onPress={() => {
                setError(null);
                share.mutate(user.id, { onError: (err) => setError(shareError(err)) });
              }}
            />
          ))}
        </>
      )}
    </Screen>
  );
}

function PersonRow({
  name,
  email,
  icon,
  iconColor,
  label,
  disabled,
  onPress,
}: {
  name: string;
  email: string;
  icon: "close-circle-outline" | "person-add-outline";
  iconColor: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.person, pressed && styles.pressed, disabled && styles.disabled]}>
          <View style={styles.grow}>
            <AppText style={styles.name}>{name}</AppText>
            <AppText variant="small">{email}</AppText>
          </View>
          <Ionicons name={icon} size={24} color={iconColor} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  name: { fontWeight: "600" },
  pressed: { backgroundColor: colors.cardPressed },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, textAlign: "center" },
});
