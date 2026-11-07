import Ionicons from "@expo/vector-icons/Ionicons";
import type { DailyPlanCandidateDto, MealCandidateDto, MealDto } from "@fitmusc/shared/api/dto";
import { decimalString, mealInputSchema, type MealInputBody } from "@fitmusc/shared/api/schemas";
import { formatDate } from "@fitmusc/shared/date-format";
import { formatScaledEntry, multiplyFood, type FoodLike, type ScaledFood } from "@fitmusc/shared/food-math";
import type { Locale } from "@fitmusc/shared/locale";
import { MEAL_ICON_PRESETS } from "@fitmusc/shared/meal-icons";
import { MEAL_LABELS, getLocalizedMealLabel, isMealLabel, type MealLabel } from "@fitmusc/shared/meal-labels";
import { getDefaultMealTime, isWeekendDate } from "@fitmusc/shared/meal-time-defaults";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { FoodReference } from "@/components/food-reference";
import { Field, Input, NumberInput, TimeField } from "@/components/form";
import { MEAL_EMOJI } from "@/components/plan-items";
import { AppText, Button, Card, Chip, ErrorView, LoadingView, Segmented, useErrorMessage } from "@/components/ui";
import { useApplyDailyMeals } from "@/hooks/ai";
import { useCloseGuard } from "@/hooks/close-guard";
import { useDeleteMeal, useMealPicker, useSaveFavoriteMeal, useSaveMeal } from "@/hooks/edit";
import { useDay, useDayMeals } from "@/hooks/plan";
import { useProfile } from "@/hooks/wellness";
import { colors, radius, spacing } from "@/lib/theme";

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
/** A macro field's current value as a number (empty or invalid → 0). */
const amount = (raw: string) => {
  const n = Number.parseFloat(normalize(raw));
  return Number.isFinite(n) ? n : 0;
};
const round1 = (n: number) => String(Math.max(0, Math.round(n * 10) / 10));

type Macros = { calories: string; proteinG: string; carbsG: string; fatG: string };
type AddedFood = { key: string; entry: string; scaled: ScaledFood };

/** Adds (sign 1) or removes (sign -1) a food's macros, like the web's food reference. */
function applyFood(macros: Macros, food: ScaledFood, sign: 1 | -1): Macros {
  return {
    calories: String(Math.max(0, Math.round(amount(macros.calories)) + sign * food.calories)),
    proteinG: round1(amount(macros.proteinG) + sign * food.protein),
    carbsG: round1(amount(macros.carbsG) + sign * food.carbs),
    fatG: round1(amount(macros.fatG) + sign * food.fat),
  };
}

/** Drops one `entry` from a ", "-joined content, matching whole entries only. */
function removeEntry(text: string, entry: string): string {
  let from = text.length;
  while (from >= 0) {
    const at = text.lastIndexOf(entry, from);
    if (at < 0) return text;
    const end = at + entry.length;
    const startsItem = at === 0 || text.startsWith(", ", at - 2);
    const endsItem = end === text.length || text.startsWith(", ", end);
    if (startsItem && endsItem) {
      if (at >= 2) return text.slice(0, at - 2) + text.slice(end);
      return text.slice(end === text.length ? end : end + 2);
    }
    from = at - 1;
  }
  return text;
}

type FormView = "form" | "picker" | "foods";

function MealForm({ dayId, meal }: { dayId: number; meal: MealDto | undefined }) {
  const t = useTranslations();
  const tf = useTranslations("meals.form");
  const tm = useTranslations("mobile.mealForm");
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
    icon: meal?.icon ?? null,
    calories: toText(meal?.calories),
    proteinG: toText(meal?.proteinG),
    carbsG: toText(meal?.carbsG),
    fatG: toText(meal?.fatG),
  };
  const [mealTime, setMealTime] = useState(initial.mealTime);
  const [timeTouched, setTimeTouched] = useState(Boolean(meal));
  const [mealLabel, setMealLabel] = useState<MealLabel | null>(initial.mealLabel);
  const [content, setContent] = useState(initial.content);
  const [icon, setIcon] = useState<string | null>(initial.icon);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [macros, setMacros] = useState<Macros>({ calories: initial.calories, proteinG: initial.proteinG, carbsG: initial.carbsG, fatG: initial.fatG });
  const [addedFoods, setAddedFoods] = useState<AddedFood[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [view, setView] = useState<FormView>("form");
  const [error, setError] = useState<string | null>(null);

  const dirty =
    mealTime !== initial.mealTime ||
    mealLabel !== initial.mealLabel ||
    content !== initial.content ||
    icon !== initial.icon ||
    (Object.keys(macros) as (keyof Macros)[]).some((k) => macros[k] !== initial[k]);
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
    setAddedFoods([]);
    setView("form");
  };

  const addFood = (food: FoodLike, multiplier: number) => {
    const scaled = multiplyFood(food, multiplier);
    const entry = formatScaledEntry(food, multiplier);
    setContent((text) => (text.trim() ? `${text.trim()}, ${entry}` : entry));
    setMacros((m) => applyFood(m, scaled, 1));
    setAddedFoods((list) => [...list, { key: `${entry}-${list.length}-${Date.now()}`, entry, scaled }]);
    setView("form");
  };

  const removeFood = (item: AddedFood) => {
    setAddedFoods((list) => list.filter((f) => f.key !== item.key));
    setContent((text) => removeEntry(text, item.entry));
    setMacros((m) => applyFood(m, item.scaled, -1));
  };

  const submit = () => {
    setError(null);
    if (!mealLabel) return setError(tm("labelRequired"));
    if (!content.trim()) return setError(tm("contentRequired"));
    const calories = normalize(macros.calories);
    const decimals = { proteinG: normalize(macros.proteinG), carbsG: normalize(macros.carbsG), fatG: normalize(macros.fatG) };
    const badDecimal = Object.values(decimals).some((v) => v && !decimalString.safeParse(v).success);
    if ((calories && !/^\d+$/.test(calories)) || badDecimal) return setError(tm("invalidMacros"));

    const body: MealInputBody = {
      mealTime,
      mealLabel,
      content: content.trim(),
      calories: calories ? Number(calories) : null,
      proteinG: decimals.proteinG || null,
      carbsG: decimals.carbsG || null,
      fatG: decimals.fatG || null,
      // PUT overwrites every column, the icon included.
      icon,
    };
    const parsed = mealInputSchema.safeParse(body);
    if (!parsed.success) return setError(tm("invalidMacros"));
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

  if (view === "picker") return <MealPicker dayId={dayId} onPick={pick} onDayApplied={leave} onClose={() => setView("form")} />;
  if (view === "foods") return <FoodReference onAdd={addFood} onClose={() => setView("form")} />;

  const macroField = (key: keyof Macros, label: string, unit: string) => (
    <Field label={label}>
      <NumberInput value={macros[key]} onChangeText={(v) => setMacros((m) => ({ ...m, [key]: v }))} unit={unit} accessibilityLabel={label} />
    </Field>
  );
  const shownEmoji = icon ?? (mealLabel ? MEAL_EMOJI[mealLabel] : null) ?? "🍴";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {meal ? null : <Button icon="library-outline" label={tf("pickFromLibrary")} variant="secondary" onPress={() => setView("picker")} />}

      <Card>
        <AppText variant="small">{tf("mealName")} *</AppText>
        <View style={styles.chips}>
          {MEAL_LABELS.map((label) => (
            <Chip key={label} label={getLocalizedMealLabel(label, locale)} selected={label === mealLabel} onPress={() => chooseLabel(label)} />
          ))}
        </View>
        <View style={styles.inlineRow}>
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
        <View style={styles.inlineRow}>
          <AppText variant="muted">{t("common.emojiPicker")}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.emojiPicker")}
            accessibilityState={{ expanded: emojiOpen }}
            onPress={() => setEmojiOpen((open) => !open)}
            style={({ pressed }) => [styles.emojiButton, pressed && styles.pressed]}
          >
            <AppText style={[styles.emojiLarge, !icon && styles.emojiFallback]}>{shownEmoji}</AppText>
            <Ionicons name={emojiOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
          </Pressable>
        </View>
        {emojiOpen ? (
          <EmojiGrid
            value={icon}
            onChange={(next) => {
              setIcon(next);
              setEmojiOpen(false);
            }}
          />
        ) : null}
      </Card>

      <Card>
        <Field label={`${tf("content")} *`}>
          <Input value={content} onChangeText={setContent} placeholder={tf("contentPlaceholder")} multiline maxLength={5000} />
        </Field>
        {addedFoods.length > 0 ? (
          <View style={styles.chips}>
            {addedFoods.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${tf("remove")}: ${item.entry}`}
                onPress={() => removeFood(item)}
                style={({ pressed }) => [styles.foodChip, pressed && styles.pressed]}
              >
                <AppText style={styles.foodChipText} numberOfLines={1}>
                  {item.entry} · {item.scaled.calories} kcal
                </AppText>
                <Ionicons name="close" size={14} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Button icon="book-outline" label={tm("addFromFoods")} variant="secondary" onPress={() => setView("foods")} />
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

/** The web's IconPicker: a preset emoji overrides the label's default. */
function EmojiGrid({ value, onChange }: { value: string | null; onChange: (icon: string | null) => void }) {
  const tm = useTranslations("mobile.mealForm");
  return (
    <View style={styles.emojiGrid}>
      <Chip label={tm("emojiDefault")} selected={value === null} onPress={() => onChange(null)} />
      <View style={styles.emojiCells}>
        {MEAL_ICON_PRESETS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={emoji}
            accessibilityState={{ selected: value === emoji }}
            onPress={() => onChange(emoji)}
            style={({ pressed }) => [styles.emojiCell, value === emoji && styles.emojiCellActive, pressed && styles.pressed]}
          >
            <AppText style={styles.emojiLarge}>{emoji}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type PickerTab = "frequent" | "history" | "saved" | "daily";

function MealPicker({
  dayId,
  onPick,
  onDayApplied,
  onClose,
}: {
  dayId: number;
  onPick: (meal: MealCandidateDto) => void;
  /** After a whole saved day replaced this day's meals. */
  onDayApplied: () => void;
  onClose: () => void;
}) {
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
  const list = tab === "daily" ? [] : (picker.data?.[tab] ?? []);
  const plans = picker.data?.dailyPlans ?? [];
  const empty = tab === "daily" ? plans.length === 0 : list.length === 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <AppText variant="heading">{t("titleAlt")}</AppText>
      <Input value={query} onChangeText={setQuery} placeholder={t("searchPlaceholder")} autoCorrect={false} returnKeyType="search" />
      <Segmented
        options={[
          { value: "frequent", label: t("tabFrequent") },
          { value: "history", label: t("tabHistory") },
          { value: "saved", label: t("tabSaved") },
          { value: "daily", label: t("tabDaily") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {picker.isLoading ? <LoadingView /> : null}
      {picker.error && !picker.data ? <ErrorView error={picker.error} onRetry={() => picker.refetch()} /> : null}
      {tab === "daily" && picker.data ? <DailyPlans dayId={dayId} plans={plans} onApplied={onDayApplied} /> : null}
      {picker.data && empty && tab !== "daily" ? <AppText variant="muted">{tm("noCandidates")}</AppText> : null}
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

const PLAN_TYPES = ["workout", "rest", "swimming", "nutrition"] as const;
const isPlanType = (value: string): value is (typeof PLAN_TYPES)[number] => (PLAN_TYPES as readonly string[]).includes(value);

/** Saved AI daily plans ("Daily" tab): one replaces all of this day's meals (web: Öğünlerim → Apply to day). */
function DailyPlans({ dayId, plans, onApplied }: { dayId: number; plans: DailyPlanCandidateDto[]; onApplied: () => void }) {
  const t = useTranslations("meals.picker");
  const tl = useTranslations("meals.library");
  const tm = useTranslations("mobile.mealForm");
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const apply = useApplyDailyMeals(dayId);
  const [error, setError] = useState<string | null>(null);

  if (plans.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText style={styles.emptyTitle}>{t("emptyDailyShort")}</AppText>
        <AppText variant="muted" style={styles.centered}>
          {t("emptyDailyHint")}
        </AppText>
      </View>
    );
  }

  const describe = (plan: DailyPlanCandidateDto) => {
    const type = isPlanType(plan.planType) ? t(`planTypes.${plan.planType}`) : plan.planType;
    const date = plan.createdAt ? formatDate(plan.createdAt, locale, { day: "numeric", month: "short" }) : "";
    const kcal = plan.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
    return { type, date, kcal };
  };

  const confirm = (plan: DailyPlanCandidateDto) => {
    const { type, date } = describe(plan);
    const label = plan.userNote ? plan.userNote.slice(0, 60) : tl("planLabelDefault", { type, date });
    Alert.alert(tl("applyDialogTitle", { label }), tl("applyDialogBody", { count: plan.meals.length }), [
      { text: tl("cancel"), style: "cancel" },
      {
        text: tl("apply"),
        onPress: () => {
          setError(null);
          apply.mutate(plan.meals, { onSuccess: onApplied, onError: (err) => setError(errorMessage(err)) });
        },
      },
    ]);
  };

  return (
    <>
      <AppText variant="muted">{tm("dailyHint")}</AppText>
      {apply.isPending ? <AppText style={styles.centered}>{tl("applying")}</AppText> : null}
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      {plans.map((plan) => {
        const { type, date, kcal } = describe(plan);
        const usable = plan.meals.length > 0 && !apply.isPending;
        return (
          <Pressable
            key={plan.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: !usable }}
            disabled={!usable}
            onPress={() => confirm(plan)}
          >
            {({ pressed }) => (
              <Card style={[pressed && { backgroundColor: colors.cardPressed }, !usable && styles.disabled]}>
                <View style={styles.candidateHead}>
                  <AppText style={styles.candidateLabel}>{type}</AppText>
                  <AppText variant="small">{t("mealCountKcalDateShort", { count: plan.meals.length, kcal, date })}</AppText>
                </View>
                {plan.userNote ? (
                  <AppText variant="small" numberOfLines={1} style={styles.note}>
                    “{plan.userNote}”
                  </AppText>
                ) : null}
                {plan.meals.slice(0, 3).map((m, i) => (
                  <AppText key={`${m.mealTime}-${i}`} variant="muted" numberOfLines={1}>
                    {m.mealTime} {getLocalizedMealLabel(isMealLabel(m.mealLabel) ? m.mealLabel : "Ara Öğün", locale)} — {m.content}
                  </AppText>
                ))}
                {plan.meals.length > 3 ? <AppText variant="small">{t("moreCountShort", { count: plan.meals.length - 3 })}</AppText> : null}
              </Card>
            )}
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  inlineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  pressed: { backgroundColor: colors.cardPressed },
  error: { color: colors.danger, textAlign: "center" },
  emojiButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiLarge: { fontSize: 22 },
  emojiFallback: { opacity: 0.5 },
  emojiGrid: { gap: spacing.sm, alignItems: "flex-start" },
  emojiCells: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  emojiCell: { width: 44, height: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  emojiCellActive: { backgroundColor: colors.cardPressed, borderWidth: 1, borderColor: colors.primary },
  foodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: "100%",
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  foodChipText: { color: colors.primary, fontSize: 13, flexShrink: 1 },
  candidateHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  candidateLabel: { fontWeight: "600" },
  note: { fontStyle: "italic" },
  disabled: { opacity: 0.5 },
  empty: { gap: spacing.xs, paddingVertical: spacing.lg },
  emptyTitle: { fontWeight: "600", textAlign: "center" },
  centered: { textAlign: "center" },
});
