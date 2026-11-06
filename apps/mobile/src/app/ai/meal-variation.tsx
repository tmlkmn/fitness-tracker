import Ionicons from "@expo/vector-icons/Ionicons";
import type { MealDto } from "@fitmusc/shared/api/dto";
import type { Locale } from "@fitmusc/shared/locale";
import { coerceMealLabel, getLocalizedMealLabel } from "@fitmusc/shared/meal-labels";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import {
  AiButton,
  AiDisclaimer,
  ErrorBox,
  MultiChips,
  NoteInput,
  Panel,
  Warnings,
  toMealGrams,
  useMacroLine,
} from "@/components/ai";
import { AppText, Button, Card, Chip, ErrorView, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import {
  useDeleteSavedMeal,
  useMealVariation,
  useSaveMealSuggestion,
  useSavedMeals,
  type MealSuggestion,
} from "@/hooks/ai";
import { useSaveMeal } from "@/hooks/edit";
import { useDayMeals } from "@/hooks/plan";
import { colors, spacing } from "@/lib/theme";

type Tab = "suggest" | "saved";

/** Three alternatives for one meal, or a saved meal in its place (web: AiSuggestionModal). */
export default function MealVariationScreen() {
  const params = useLocalSearchParams<{ dayId: string; mealId: string }>();
  const dayId = Number(params.dayId);
  const mealId = Number(params.mealId);
  const meals = useDayMeals(dayId);
  if (meals.isLoading) return <LoadingView />;
  const meal = meals.data?.find((m) => m.id === mealId);
  if (!meal) return <ErrorView error={meals.error} onRetry={() => meals.refetch()} />;
  return <Variation dayId={dayId} meal={meal} />;
}

function Variation({ dayId, meal }: { dayId: number; meal: MealDto }) {
  const t = useTranslations("meals.aiSuggestion");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const macroLine = useMacroLine();
  const variation = useMealVariation();
  const update = useSaveMeal(dayId, meal.id);
  const saved = useSavedMeals();
  const [tab, setTab] = useState<Tab>("suggest");
  const [ingredientMode, setIngredientMode] = useState<"all" | "specific">("all");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Earlier rounds' contents, so the next round doesn't repeat them.
  const previous = useRef<string[]>([]);
  const label = getLocalizedMealLabel(coerceMealLabel(meal.mealLabel), locale);

  const generate = () => {
    setError(null);
    const parts = [
      ingredientMode === "specific" && ingredients.length > 0 ? t("ingredientNote", { list: ingredients.join(", ") }) : null,
      note.trim() || null,
    ].filter(Boolean);
    variation.mutate(
      {
        mealLabel: meal.mealLabel,
        currentContent: meal.content,
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
        mealId: meal.id,
        dailyPlanId: dayId,
        previousSuggestions: previous.current.slice(-10),
        userNote: parts.length > 0 ? parts.join(". ") : undefined,
      },
      {
        onSuccess: (result) => {
          previous.current.push(...result.suggestions.map((s) => s.content).filter(Boolean));
        },
        onError: (err) => setError(errorMessage(err)),
      },
    );
  };

  /** Writes the suggestion into this meal (PUT keeps its time, label and icon). */
  const apply = (s: MealSuggestion) => {
    setError(null);
    update.mutate(
      {
        mealTime: meal.mealTime,
        mealLabel: meal.mealLabel,
        content: s.content,
        calories: s.calories,
        proteinG: toMealGrams(s.proteinG),
        carbsG: toMealGrams(s.carbsG),
        fatG: toMealGrams(s.fatG),
        icon: meal.icon,
      },
      { onSuccess: () => router.back(), onError: (err) => setError(errorMessage(err)) },
    );
  };

  const suggestions = variation.data?.suggestions ?? [];
  return (
    <>
      <Stack.Screen options={{ title: t("modalTitle") }} />
      <Screen>
        <Panel title={t("currentMeal")}>
          <AppText style={{ fontWeight: "600" }}>{label}</AppText>
          <AppText variant="muted">{meal.content}</AppText>
          {macroLine(meal) ? <AppText variant="small">{macroLine(meal)}</AppText> : null}
        </Panel>
        <Segmented
          options={[
            { value: "suggest", label: t("generate") },
            { value: "saved", label: t("saved", { count: saved.data?.length ?? 0 }) },
          ]}
          value={tab}
          onChange={setTab}
        />
        {error ? <ErrorBox message={error} /> : null}

        {tab === "suggest" && suggestions.length === 0 ? (
          <>
            <Card>
              <AppText variant="small">{t("homeIngredientsLabel")}</AppText>
              <View style={styles.chips}>
                <Chip label={t("modeAll")} selected={ingredientMode === "all"} onPress={() => setIngredientMode("all")} />
                <Chip label={t("modeSpecific")} selected={ingredientMode === "specific"} onPress={() => setIngredientMode("specific")} />
              </View>
              {ingredientMode === "specific" ? (
                <MultiChips
                  options={(t.raw("ingredients") as string[]).map((v) => ({ value: v, label: v }))}
                  selected={ingredients}
                  onChange={setIngredients}
                />
              ) : null}
              <NoteInput value={note} onChange={setNote} label={t("noteHint")} placeholder={t("notePlaceholder")} />
            </Card>
            {variation.isPending ? <AppText variant="muted">{t("loading")}</AppText> : null}
            <AiButton label={t("generate")} feature="meal" loading={variation.isPending} onPress={generate} />
          </>
        ) : null}

        {tab === "suggest" && suggestions.length > 0 ? (
          <>
            <Warnings title={t("warningsTitle")} items={variation.data?.validationWarnings ?? []} />
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={`${i}-${s.content.slice(0, 20)}`}
                index={i}
                suggestion={s}
                mealLabel={meal.mealLabel}
                applying={update.isPending}
                onApply={() => apply(s)}
              />
            ))}
            <AiButton
              label={t("newSuggestions")}
              feature="meal"
              variant="secondary"
              loading={variation.isPending}
              disabled={update.isPending}
              onPress={generate}
            />
            <AiDisclaimer />
          </>
        ) : null}

        {tab === "saved" ? <SavedMeals applying={update.isPending} onApply={apply} /> : null}
      </Screen>
    </>
  );
}

function SuggestionCard({
  index,
  suggestion,
  mealLabel,
  applying,
  onApply,
}: {
  index: number;
  suggestion: MealSuggestion;
  mealLabel: string;
  applying: boolean;
  onApply: () => void;
}) {
  const t = useTranslations("meals.aiSuggestion");
  const macroLine = useMacroLine();
  const save = useSaveMealSuggestion();
  return (
    <Panel title={t("suggestionN", { n: index + 1 })} tone="suggested">
      <AppText>{suggestion.content}</AppText>
      {macroLine(suggestion) ? <AppText variant="small">{macroLine(suggestion)}</AppText> : null}
      <View style={styles.actions}>
        <Button label={t("apply")} loading={applying} style={{ flex: 1 }} onPress={onApply} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("savedTitle")}
          accessibilityState={{ disabled: save.isSuccess || save.isPending }}
          disabled={save.isSuccess || save.isPending}
          hitSlop={8}
          onPress={() =>
            save.mutate({
              mealLabel,
              content: suggestion.content,
              calories: suggestion.calories,
              proteinG: toMealGrams(suggestion.proteinG),
              carbsG: toMealGrams(suggestion.carbsG),
              fatG: toMealGrams(suggestion.fatG),
            })
          }
          style={styles.bookmark}
        >
          <Ionicons name={save.isSuccess ? "bookmark" : "bookmark-outline"} size={20} color={save.isSuccess ? colors.primary : colors.text} />
        </Pressable>
      </View>
    </Panel>
  );
}

function SavedMeals({ applying, onApply }: { applying: boolean; onApply: (s: MealSuggestion) => void }) {
  const t = useTranslations();
  const ts = useTranslations("meals.aiSuggestion");
  const locale = useLocale() as Locale;
  const macroLine = useMacroLine();
  const saved = useSavedMeals();
  const remove = useDeleteSavedMeal();
  const [filter, setFilter] = useState<string | null>(null);

  if (saved.isLoading) return <LoadingView />;
  if (!saved.data) return <ErrorView error={saved.error} onRetry={() => saved.refetch()} />;
  if (saved.data.length === 0) return <AppText variant="muted">{ts("emptySaved")}</AppText>;

  const labels = [...new Set(saved.data.map((s) => s.mealLabel))];
  const shown = filter ? saved.data.filter((s) => s.mealLabel === filter) : saved.data;
  const display = (l: string) => getLocalizedMealLabel(coerceMealLabel(l), locale);
  return (
    <>
      {labels.length > 1 ? (
        <View style={styles.chips}>
          <Chip label={ts("filterAll", { count: saved.data.length })} selected={filter === null} onPress={() => setFilter(null)} />
          {labels.map((l) => (
            <Chip key={l} label={display(l)} selected={filter === l} onPress={() => setFilter(filter === l ? null : l)} />
          ))}
        </View>
      ) : null}
      {shown.map((s) => (
        <Card key={s.id}>
          <AppText variant="small">{display(s.mealLabel)}</AppText>
          <AppText>{s.content}</AppText>
          {macroLine(s) ? <AppText variant="small">{macroLine(s)}</AppText> : null}
          <View style={styles.actions}>
            <Button label={ts("apply")} loading={applying} style={{ flex: 1 }} onPress={() => onApply(s)} />
            <Button label={t("common.delete")} variant="danger" loading={remove.isPending && remove.variables === s.id} onPress={() => remove.mutate(s.id)} />
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  bookmark: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
