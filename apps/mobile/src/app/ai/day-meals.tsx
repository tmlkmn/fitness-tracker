import Ionicons from "@expo/vector-icons/Ionicons";
import type { SavedDailyMealSuggestionDto } from "@fitmusc/shared/api/dto";
import { formatDate } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AiButton, ErrorBox, MeasurementNudge, NoteInput, Panel, buildAiUserNote } from "@/components/ai";
import { MealRows, useLaunchJob } from "@/components/ai-results";
import { Input } from "@/components/form";
import { AppText, Button, Card, ErrorView, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import { useApplyDailyMeals, useDeleteDailySuggestion, useSavedDailySuggestions } from "@/hooks/ai";
import { useDay, useDayMeals } from "@/hooks/plan";
import { colors, spacing } from "@/lib/theme";

type Tab = "suggest" | "saved";

/** Options for a new daily meal plan (web: AiMealModal), or a saved one to apply. */
export default function AiDayMealsScreen() {
  const t = useTranslations("meals.aiModal");
  const dayId = Number(useLocalSearchParams<{ dayId: string }>().dayId);
  const day = useDay(dayId);
  const meals = useDayMeals(dayId);
  const errorMessage = useErrorMessage();
  const job = useLaunchJob(errorMessage);
  const [tab, setTab] = useState<Tab>("suggest");
  const [ingredients, setIngredients] = useState("");
  const [note, setNote] = useState("");

  if (day.isLoading || meals.isLoading) return <LoadingView />;
  if (!day.data) return <ErrorView error={day.error} onRetry={() => day.refetch()} />;

  const current = meals.data ?? [];
  const generate = () =>
    job.launch({
      kind: "daily-meals",
      dailyPlanId: dayId,
      userNote: buildAiUserNote([ingredients.trim() ? `${t("ingredientsPrefix")}: ${ingredients.trim()}` : null, note]),
    });

  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <Screen>
        <Segmented
          options={[
            { value: "suggest", label: t("tabSuggest") },
            { value: "saved", label: t("tabSaved") },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "suggest" ? (
          <>
            <Panel title={t("currentMeals")}>
              <MealRows meals={current} />
            </Panel>
            <MeasurementNudge />
            <Card>
              <View style={{ gap: spacing.xs }}>
                <AppText variant="small">{t("ingredientsLabel")}</AppText>
                <Input value={ingredients} onChangeText={setIngredients} placeholder={t("ingredientsPlaceholder")} multiline maxLength={300} />
              </View>
              <NoteInput value={note} onChange={setNote} label={t("specialRequestLabel")} placeholder={t("specialRequestPlaceholder")} />
            </Card>
            {job.error ? <ErrorBox message={job.error} /> : null}
            <AiButton label={t("getSuggestion")} feature="daily-meal" loading={job.isPending} onPress={generate} />
          </>
        ) : (
          <SavedList dayId={dayId} planType={day.data.planType} />
        )}
      </Screen>
    </>
  );
}

function SavedList({ dayId, planType }: { dayId: number; planType: string }) {
  const t = useTranslations("meals.aiModal");
  const saved = useSavedDailySuggestions(planType);
  if (saved.isLoading) return <LoadingView />;
  if (!saved.data) return <ErrorView error={saved.error} onRetry={() => saved.refetch()} />;
  if (saved.data.length === 0) return <AppText variant="muted">{t("noSaved")}</AppText>;
  return (
    <>
      {saved.data.map((suggestion) => (
        <SavedRow key={suggestion.id} dayId={dayId} suggestion={suggestion} />
      ))}
    </>
  );
}

function SavedRow({ dayId, suggestion }: { dayId: number; suggestion: SavedDailyMealSuggestionDto }) {
  const t = useTranslations();
  const tm = useTranslations("meals.aiModal");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const apply = useApplyDailyMeals(dayId);
  const remove = useDeleteDailySuggestion();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kcal = suggestion.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

  const confirmDelete = () =>
    Alert.alert(t("common.delete"), suggestion.userNote ?? tm("mealCount", { count: suggestion.meals.length }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => remove.mutate(suggestion.id) },
    ]);

  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={styles.title}>
            {formatDate(suggestion.createdAt, locale, { day: "numeric", month: "short" })} · {tm("mealCount", { count: suggestion.meals.length })}
            {kcal > 0 ? ` · ${kcal} kcal` : ""}
          </AppText>
          {suggestion.userNote ? (
            <AppText variant="small" numberOfLines={open ? undefined : 1}>
              {suggestion.userNote}
            </AppText>
          ) : null}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <>
          <MealRows meals={suggestion.meals} />
          {error ? <ErrorBox message={error} /> : null}
          <View style={styles.actions}>
            <Button
              label={tm("apply")}
              loading={apply.isPending}
              style={{ flex: 1 }}
              onPress={() => {
                setError(null);
                apply.mutate(suggestion.meals, { onSuccess: () => router.back(), onError: (err) => setError(errorMessage(err)) });
              }}
            />
            <Button label={t("common.delete")} variant="danger" loading={remove.isPending} onPress={confirmDelete} />
          </View>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontWeight: "600", fontSize: 14 },
  actions: { flexDirection: "row", gap: spacing.sm },
});
