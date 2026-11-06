import Ionicons from "@expo/vector-icons/Ionicons";
import type { ShoppingItemDto, WeeklyPlanDto } from "@fitmusc/shared/api/dto";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import { coerceMealLabel, getLocalizedMealLabel } from "@fitmusc/shared/meal-labels";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AppText, Button, Card, Chip, ErrorView, LoadingView, ProgressBar, Screen, useErrorMessage } from "@/components/ui";
import { useGenerateShoppingList, useMealRefs, useShoppingList, useTogglePurchased, useWeeks } from "@/hooks/shopping";
import { ApiRequestError } from "@/lib/api";
import { addDays, todayStr } from "@/lib/dates";
import { colors, radius, spacing } from "@/lib/theme";

function currentWeekId(weeks: WeeklyPlanDto[]): number | null {
  const today = todayStr();
  return weeks.find((w) => w.startDate && w.startDate <= today && today <= addDays(w.startDate, 6))?.id ?? null;
}

function useWeekLabel() {
  const t = useTranslations("shopping");
  const locale = useLocale() as Locale;
  return (week: WeeklyPlanDto) => {
    if (!week.startDate) return t("weekShort", { week: week.weekNumber });
    const end = addDays(week.startDate, 6);
    const fmt = (d: string, o: Intl.DateTimeFormatOptions) => formatDate(parseDateOnly(d), locale, o);
    const startMonth = fmt(week.startDate, { month: "short" });
    const endMonth = fmt(end, { month: "short" });
    const startDay = Number(week.startDate.slice(8));
    const endDay = Number(end.slice(8));
    return startMonth === endMonth ? `${startDay}–${endDay} ${startMonth}` : `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  };
}

export default function ShoppingScreen() {
  const t = useTranslations();
  const { week } = useLocalSearchParams<{ week?: string }>();
  const weeks = useWeeks();
  const weekLabel = useWeekLabel();
  const [picked, setPicked] = useState<number | null>(week ? Number(week) : null);

  if (weeks.isLoading) return <LoadingView />;
  if (!weeks.data) return <ErrorView error={weeks.error} onRetry={() => weeks.refetch()} />;
  const list = weeks.data;
  if (list.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t("shopping.title") }} />
        <AppText variant="muted">{t("mobile.shopping.noWeeks")}</AppText>
      </Screen>
    );
  }
  const activeId = list.some((w) => w.id === picked) ? picked! : (currentWeekId(list) ?? list[0].id);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: t("shopping.title") }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekBar} contentContainerStyle={styles.weeks}>
        {list.map((w) => (
          <Chip key={w.id} label={weekLabel(w)} selected={w.id === activeId} onPress={() => setPicked(w.id)} />
        ))}
      </ScrollView>
      <WeekList key={activeId} weeklyPlanId={activeId} />
    </View>
  );
}

function WeekList({ weeklyPlanId }: { weeklyPlanId: number }) {
  const t = useTranslations("shopping");
  const tm = useTranslations("mobile.shopping");
  const errorMessage = useErrorMessage();
  const items = useShoppingList(weeklyPlanId);
  const toggle = useTogglePurchased(weeklyPlanId);
  const generate = useGenerateShoppingList(weeklyPlanId);

  const run = () => generate.mutate();
  const confirmGenerate = (refresh: boolean) =>
    Alert.alert(refresh ? t("refreshTitle") : t("generateButton"), refresh ? t("refreshConfirm") : tm("generateConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: refresh ? t("refresh") : t("generateButton"), style: refresh ? "destructive" : "default", onPress: run },
    ]);
  const generateError =
    generate.error instanceof ApiRequestError && generate.error.code === "NO_MEALS"
      ? t("noMealsError")
      : generate.error
        ? errorMessage(generate.error)
        : null;

  if (items.isLoading) return <LoadingView />;
  if (!items.data) return <ErrorView error={items.error} onRetry={() => items.refetch()} />;

  const list = items.data;
  const purchased = list.filter((i) => i.isPurchased).length;
  const groups: { category: string; items: ShoppingItemDto[] }[] = [];
  for (const item of list) {
    const group = groups.find((g) => g.category === item.category);
    if (group) group.items.push(item);
    else groups.push({ category: item.category, items: [item] });
  }

  return (
    <Screen refreshing={items.isRefetching} onRefresh={() => items.refetch()}>
      {generate.isPending ? (
        <Card style={styles.generating}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="muted">{t("generating")}</AppText>
        </Card>
      ) : null}
      {generateError ? <AppText style={styles.error}>{generateError}</AppText> : null}

      {list.length === 0 ? (
        <Card>
          <AppText variant="muted">{t("emptyDescription")}</AppText>
          <Button label={`✨ ${t("generateButton")}`} loading={generate.isPending} onPress={() => confirmGenerate(false)} />
        </Card>
      ) : (
        <>
          <Card>
            <View style={styles.summaryRow}>
              <AppText variant="muted">{t("itemsCount", { purchased, total: list.length })}</AppText>
              <AppText variant="small">
                {purchased === list.length ? `✓ ${t("completed")}` : `%${Math.round((purchased / list.length) * 100)}`}
              </AppText>
            </View>
            <ProgressBar value={purchased} max={list.length} />
          </Card>
          {groups.map((group) => (
            <Card key={group.category}>
              <View style={styles.summaryRow}>
                <AppText variant="heading">{group.category}</AppText>
                <AppText variant="small">
                  {group.items.filter((i) => i.isPurchased).length}/{group.items.length}
                </AppText>
              </View>
              {group.items.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggle.mutate({ id: item.id, isPurchased: !item.isPurchased })}
                />
              ))}
            </Card>
          ))}
          <Button
            label={`↻ ${t("refresh")}`}
            variant="ghost"
            disabled={generate.isPending}
            onPress={() => confirmGenerate(true)}
          />
        </>
      )}
    </Screen>
  );
}

function ShoppingRow({ item, onToggle }: { item: ShoppingItemDto; onToggle: () => void }) {
  const t = useTranslations("shopping");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const mealIds = item.mealIds ?? [];
  const refs = useMealRefs(mealIds, open);
  const done = Boolean(item.isPurchased);

  return (
    <View style={styles.item}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${item.itemName}, ${item.quantity}`}
        onPress={onToggle}
        style={styles.itemRow}
      >
        <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={24} color={done ? colors.primary : colors.textMuted} />
        <View style={styles.flex}>
          <AppText style={done && styles.struck}>{item.itemName}</AppText>
          {item.notes ? <AppText variant="small">{item.notes}</AppText> : null}
        </View>
        <AppText variant="muted" style={done && styles.struck}>
          {item.quantity}
        </AppText>
      </Pressable>
      {mealIds.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          style={styles.mealsToggle}
          hitSlop={6}
        >
          <AppText variant="small">{t("usedInMealsLabel", { count: mealIds.length })}</AppText>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
        </Pressable>
      ) : null}
      {open ? (
        <View style={styles.meals}>
          {refs.isLoading ? <AppText variant="small">{t("loadingLinkedMeals")}</AppText> : null}
          {refs.data?.length === 0 ? <AppText variant="small">{t("noLinkedMeals")}</AppText> : null}
          {refs.data?.map((meal) => (
            <AppText key={meal.id} variant="small" numberOfLines={2}>
              {meal.dayName} · {getLocalizedMealLabel(coerceMealLabel(meal.mealLabel), locale)}: {meal.content}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  weekBar: { flexGrow: 0, backgroundColor: colors.background },
  weeks: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  generating: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  error: { color: colors.danger },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  item: { gap: spacing.xs },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  struck: { textDecorationLine: "line-through", color: colors.textMuted },
  mealsToggle: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginLeft: 24 + spacing.md },
  meals: {
    marginLeft: 24 + spacing.md,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
});
