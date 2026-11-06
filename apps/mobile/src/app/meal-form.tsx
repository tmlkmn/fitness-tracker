import type { MealCandidateDto, MealDto } from "@fitmusc/shared/api/dto";
import { decimalString, mealInputSchema, type MealInputBody } from "@fitmusc/shared/api/schemas";
import { MEAL_LABELS, getLocalizedMealLabel, isMealLabel, type MealLabel } from "@fitmusc/shared/meal-labels";
import { getDefaultMealTime, isWeekendDate } from "@fitmusc/shared/meal-time-defaults";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { Field, Input, NumberInput, TimeField } from "@/components/form";
import { AppText, Button, Card, Chip, ErrorView, LoadingView, Segmented, useErrorMessage } from "@/components/ui";
import { useCloseGuard } from "@/hooks/close-guard";
import { useDeleteMeal, useMealPicker, useSaveFavoriteMeal, useSaveMeal } from "@/hooks/edit";
import { useDay, useDayMeals } from "@/hooks/plan";
import { useProfile } from "@/hooks/wellness";
import { colors, spacing } from "@/lib/theme";

type RoutineItem = { time: string; event: string };

export default function MealFormScreen() {
  const t = useTranslations("meals.form");
  const params = useLocalSearchParams<{ dayId: string; mealId?: string }>();
  const dayId = Number(params.dayId);
  const mealId = params.mealId ? Number(params.mealId) : null;
  const meals = useDayMeals(dayId);

  if (mealId != null && meals.isLoading) return <LoadingView />;
  const meal = mealId != null ? meals.data?.find((m) => m.id === mealId) : undefined;
  if (mealId != null && !meal) return <ErrorView error={meals.error} onRetry={() => meals.refetch()} />;

  return (
    <>
      <Stack.Screen options={{ title: meal ? t("titleEdit") : t("titleNew") }} />
      <MealForm key={meal?.id ?? "new"} dayId={dayId} meal={meal} />
    </>
  );
}

const toText = (value: string | number | null | undefined) => (value == null ? "" : String(value));
const normalize = (raw: string) => raw.trim().replace(",", ".");

function MealForm({ dayId, meal }: { dayId: number; meal: MealDto | undefined }) {
  const t = useTranslations();
  const tf = useTranslations("meals.form");
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const day = useDay(dayId);
  const profile = useProfile();
  const save = useSaveMeal(dayId, meal?.id ?? null);
  const remove = useDeleteMeal(dayId);
  const saveFavorite = useSaveFavoriteMeal();

  const initial = {
    mealTime: meal?.mealTime ?? "08:00",
    mealLabel: isMealLabel(meal?.mealLabel) ? meal.mealLabel : null,
    content: meal?.content ?? "",
    calories: toText(meal?.calories),
    proteinG: toText(meal?.proteinG),
    carbsG: toText(meal?.carbsG),
    fatG: toText(meal?.fatG),
  };
  const [mealTime, setMealTime] = useState(initial.mealTime);
  const [timeTouched, setTimeTouched] = useState(Boolean(meal));
  const [mealLabel, setMealLabel] = useState<MealLabel | null>(initial.mealLabel);
  const [content, setContent] = useState(initial.content);
  const [macros, setMacros] = useState({ calories: initial.calories, proteinG: initial.proteinG, carbsG: initial.carbsG, fatG: initial.fatG });
  const [favorite, setFavorite] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    mealTime !== initial.mealTime ||
    mealLabel !== initial.mealLabel ||
    content !== initial.content ||
    (Object.keys(macros) as (keyof typeof macros)[]).some((k) => macros[k] !== initial[k]);
  const { leave } = useCloseGuard(dirty && !save.isPending);

  const routine = (): RoutineItem[] | null => {
    const date = day.data?.date;
    const weekend = date ? isWeekendDate(date) : false;
    const daily = profile.data?.dailyRoutine as RoutineItem[] | null | undefined;
    const weekendRoutine = profile.data?.weekendRoutine as RoutineItem[] | null | undefined;
    return (weekend ? (weekendRoutine ?? daily) : daily) ?? null;
  };

  const chooseLabel = (label: MealLabel) => {
    setMealLabel(label);
    // A new meal's time follows the label through the user's routine until set by hand.
    if (!timeTouched) setMealTime(getDefaultMealTime(label, routine()));
  };

  const pick = (candidate: MealCandidateDto) => {
    if (isMealLabel(candidate.mealLabel)) chooseLabel(candidate.mealLabel);
    setContent(candidate.content);
    setMacros({
      calories: toText(candidate.calories),
      proteinG: toText(candidate.proteinG),
      carbsG: toText(candidate.carbsG),
      fatG: toText(candidate.fatG),
    });
    setPicking(false);
  };

  const submit = () => {
    setError(null);
    if (!mealLabel) return setError(t("mobile.mealForm.labelRequired"));
    if (!content.trim()) return setError(t("mobile.mealForm.contentRequired"));
    const calories = normalize(macros.calories);
    const decimals = { proteinG: normalize(macros.proteinG), carbsG: normalize(macros.carbsG), fatG: normalize(macros.fatG) };
    const badDecimal = Object.values(decimals).some((v) => v && !decimalString.safeParse(v).success);
    if ((calories && !/^\d+$/.test(calories)) || badDecimal) return setError(t("mobile.mealForm.invalidMacros"));

    const body: MealInputBody = {
      mealTime,
      mealLabel,
      content: content.trim(),
      calories: calories ? Number(calories) : null,
      proteinG: decimals.proteinG || null,
      carbsG: decimals.carbsG || null,
      fatG: decimals.fatG || null,
      // PUT overwrites every column — keep the meal's emoji override.
      icon: meal?.icon ?? null,
    };
    const parsed = mealInputSchema.safeParse(body);
    if (!parsed.success) return setError(t("mobile.mealForm.invalidMacros"));
    save.mutate(parsed.data, {
      onSuccess: () => {
        if (favorite && !meal) {
          const { mealLabel: label, content: text, calories: kcal, proteinG, carbsG, fatG } = parsed.data;
          // Best effort, like the web: the meal itself is already saved.
          saveFavorite.mutate({ mealLabel: label, content: text, calories: kcal ?? null, proteinG: proteinG ?? null, carbsG: carbsG ?? null, fatG: fatG ?? null });
        }
        leave();
      },
      onError: (err) => setError(errorMessage(err)),
    });
  };

  const confirmDelete = () => {
    if (!meal) return;
    const label = getLocalizedMealLabel(isMealLabel(meal.mealLabel) ? meal.mealLabel : "Ara Öğün", locale);
    Alert.alert(t("meals.delete.title"), `${t("meals.delete.confirmationPrefix")}${label}${t("meals.delete.confirmationSuffix")}`, [
      { text: t("meals.delete.cancel"), style: "cancel" },
      {
        text: t("meals.delete.delete"),
        style: "destructive",
        onPress: () => remove.mutate(meal.id, { onSuccess: leave, onError: (err) => setError(errorMessage(err)) }),
      },
    ]);
  };

  if (picking) return <MealPicker dayId={dayId} onPick={pick} onClose={() => setPicking(false)} />;

  const macroField = (key: keyof typeof macros, label: string, unit: string) => (
    <Field label={label}>
      <NumberInput value={macros[key]} onChangeText={(v) => setMacros((m) => ({ ...m, [key]: v }))} unit={unit} accessibilityLabel={label} />
    </Field>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {meal ? null : <Button label={`📚 ${tf("pickFromLibrary")}`} variant="secondary" onPress={() => setPicking(true)} />}

      <Card>
        <AppText variant="small">{tf("mealName")} *</AppText>
        <View style={styles.chips}>
          {MEAL_LABELS.map((label) => (
            <Chip key={label} label={getLocalizedMealLabel(label, locale)} selected={label === mealLabel} onPress={() => chooseLabel(label)} />
          ))}
        </View>
        <View style={styles.timeRow}>
          <AppText variant="muted">{tf("time")}</AppText>
          <TimeField
            value={mealTime}
            onChange={(time) => {
              setMealTime(time);
              setTimeTouched(true);
            }}
            accessibilityLabel={tf("time")}
          />
        </View>
      </Card>

      <Card>
        <Field label={`${tf("content")} *`}>
          <Input value={content} onChangeText={setContent} placeholder={tf("contentPlaceholder")} multiline maxLength={5000} />
        </Field>
      </Card>

      <Card>
        <AppText variant="small">{tf("nutritionFacts")}</AppText>
        <View style={styles.row}>
          {macroField("calories", tf("calories"), "kcal")}
          {macroField("proteinG", tf("protein"), "g")}
        </View>
        <View style={styles.row}>
          {macroField("carbsG", tf("carbs"), "g")}
          {macroField("fatG", tf("fat"), "g")}
        </View>
      </Card>

      {meal ? null : (
        <Card style={styles.switchRow}>
          <AppText style={styles.grow}>⭐ {tf("saveAsFavorite")}</AppText>
          <Switch value={favorite} onValueChange={setFavorite} trackColor={{ true: colors.primary, false: colors.border }} />
        </Card>
      )}

      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <Button label={meal ? tf("update") : tf("add")} loading={save.isPending} onPress={submit} />
      {meal ? <Button label={t("meals.delete.delete")} variant="danger" loading={remove.isPending} onPress={confirmDelete} /> : null}
    </ScrollView>
  );
}

type PickerTab = "frequent" | "history" | "saved";

function MealPicker({ dayId, onPick, onClose }: { dayId: number; onPick: (meal: MealCandidateDto) => void; onClose: () => void }) {
  const t = useTranslations("meals.picker");
  const tm = useTranslations("mobile.mealForm");
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tab, setTab] = useState<PickerTab>("frequent");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const picker = useMealPicker(debounced, dayId, true);
  const list = picker.data?.[tab] ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <AppText variant="heading">{t("titleAlt")}</AppText>
      <Input value={query} onChangeText={setQuery} placeholder={t("searchPlaceholder")} autoCorrect={false} returnKeyType="search" />
      <Segmented
        options={[
          { value: "frequent", label: t("tabFrequent") },
          { value: "history", label: t("tabHistory") },
          { value: "saved", label: t("tabSaved") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {picker.isLoading ? <LoadingView /> : null}
      {picker.error && !picker.data ? <ErrorView error={picker.error} onRetry={() => picker.refetch()} /> : null}
      {picker.data && list.length === 0 ? <AppText variant="muted">{tm("noCandidates")}</AppText> : null}
      {list.map((candidate) => (
        <Pressable key={`${candidate.source}-${candidate.id}`} accessibilityRole="button" onPress={() => onPick(candidate)}>
          {({ pressed }) => (
            <Card style={pressed && { backgroundColor: colors.cardPressed }}>
              <View style={styles.candidateHead}>
                <AppText style={styles.candidateLabel}>
                  {getLocalizedMealLabel(isMealLabel(candidate.mealLabel) ? candidate.mealLabel : "Ara Öğün", locale)}
                </AppText>
                {candidate.calories != null ? <AppText variant="small">{candidate.calories} kcal</AppText> : null}
              </View>
              <AppText variant="muted" numberOfLines={3}>
                {candidate.content}
              </AppText>
              {candidate.meta ? <AppText variant="small">{candidate.meta}</AppText> : null}
            </Card>
          )}
        </Pressable>
      ))}
      <Button label={t("close")} variant="ghost" onPress={onClose} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  error: { color: colors.danger, textAlign: "center" },
  candidateHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  candidateLabel: { fontWeight: "600" },
});
