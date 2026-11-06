import type { ExerciseDto } from "@fitmusc/shared/api/dto";
import { EXERCISE_SECTIONS, exerciseInputSchema, type ExerciseInputBody } from "@fitmusc/shared/api/schemas";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import { Field, Input, NumberInput } from "@/components/form";
import { AppText, Button, Card, Chip, ErrorView, LoadingView, useErrorMessage } from "@/components/ui";
import { useCloseGuard } from "@/hooks/close-guard";
import { useDeleteExercise, useExerciseSearch, useSaveExercise } from "@/hooks/edit";
import { useDayExercises } from "@/hooks/plan";
import { colors, radius, spacing } from "@/lib/theme";

type Section = (typeof EXERCISE_SECTIONS)[number];

const REP_PRESETS = ["8-10", "10-12", "12-15", "15-20"];
const REST_PRESETS = [30, 60, 90, 120];

export default function ExerciseFormScreen() {
  const t = useTranslations("exercises.form");
  const params = useLocalSearchParams<{ dayId: string; exerciseId?: string }>();
  const dayId = Number(params.dayId);
  const exerciseId = params.exerciseId ? Number(params.exerciseId) : null;
  const exercises = useDayExercises(dayId);

  if (exerciseId != null && exercises.isLoading) return <LoadingView />;
  const exercise = exerciseId != null ? exercises.data?.find((e) => e.id === exerciseId) : undefined;
  if (exerciseId != null && !exercise) return <ErrorView error={exercises.error} onRetry={() => exercises.refetch()} />;

  return (
    <>
      <Stack.Screen options={{ title: exercise ? t("titleEdit") : t("titleNew") }} />
      <ExerciseForm key={exercise?.id ?? "new"} dayId={dayId} exercise={exercise} />
    </>
  );
}

const toText = (value: string | number | null | undefined) => (value == null ? "" : String(value));
const isSection = (value: string | undefined): value is Section => EXERCISE_SECTIONS.includes(value as Section);

function ExerciseForm({ dayId, exercise }: { dayId: number; exercise: ExerciseDto | undefined }) {
  const t = useTranslations();
  const tf = useTranslations("exercises.form");
  const errorMessage = useErrorMessage();
  const save = useSaveExercise(dayId, exercise?.id ?? null);
  const remove = useDeleteExercise(dayId);

  const initial = {
    section: isSection(exercise?.section) ? exercise.section : ("main" as Section),
    name: exercise?.name ?? "",
    sets: toText(exercise?.sets),
    reps: exercise?.reps ?? "",
    rest: toText(exercise?.restSeconds),
    duration: toText(exercise?.durationMinutes),
    notes: exercise?.notes ?? "",
  };
  const [form, setForm] = useState(initial);
  // Suggestions show while the name is being typed, and hide once one is picked.
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const dirty = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== initial[k]);
  const { leave } = useCloseGuard(dirty && !save.isPending);

  const int = (text: string) => (text.trim() ? Number(text.trim()) : null);

  const submit = () => {
    setError(null);
    if (!form.name.trim()) return setError(t("mobile.exerciseForm.nameRequired"));
    const body: ExerciseInputBody = {
      section: form.section,
      // Same as the web: the label is the section's name in the user's language.
      sectionLabel: tf(`sectionLabels.${form.section}`),
      name: form.name.trim(),
      sets: int(form.sets),
      reps: form.reps.trim() || null,
      restSeconds: int(form.rest),
      durationMinutes: int(form.duration),
      notes: form.notes.trim() || null,
    };
    const parsed = exerciseInputSchema.safeParse(body);
    if (!parsed.success) return setError(t("mobile.exerciseForm.invalidNumbers"));
    save.mutate(parsed.data, { onSuccess: leave, onError: (err) => setError(errorMessage(err)) });
  };

  const confirmDelete = () => {
    if (!exercise) return;
    Alert.alert(
      t("exercises.delete.title"),
      `${t("exercises.delete.confirmationPrefix")}${exercise.name}${t("exercises.delete.confirmationSuffix")}`,
      [
        { text: t("exercises.delete.cancel"), style: "cancel" },
        {
          text: t("exercises.delete.delete"),
          style: "destructive",
          onPress: () => remove.mutate(exercise.id, { onSuccess: leave, onError: (err) => setError(errorMessage(err)) }),
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <Card>
        <AppText variant="small">{tf("section")}</AppText>
        <View style={styles.chips}>
          {EXERCISE_SECTIONS.map((section) => (
            <Chip key={section} label={tf(`sectionLabels.${section}`)} selected={form.section === section} onPress={() => set("section", section)} />
          ))}
        </View>
      </Card>

      <Card>
        <Field label={tf("name")}>
          <Input
            value={form.name}
            onChangeText={(v) => {
              set("name", v);
              setSuggesting(true);
            }}
            placeholder={tf("namePlaceholderShort")}
            autoCorrect={false}
            maxLength={120}
          />
        </Field>
        {suggesting ? (
          <LibrarySuggestions
            query={form.name}
            onPick={(name) => {
              set("name", name);
              setSuggesting(false);
            }}
          />
        ) : null}
      </Card>

      <Card>
        <View style={styles.row}>
          <Field label={tf("sets")}>
            <NumberInput value={form.sets} onChangeText={(v) => set("sets", v)} accessibilityLabel={tf("sets")} />
          </Field>
          <Field label={tf("reps")}>
            <Input value={form.reps} onChangeText={(v) => set("reps", v)} placeholder="10-12" maxLength={30} />
          </Field>
        </View>
        <View style={styles.chips}>
          {REP_PRESETS.map((preset) => (
            <Chip key={preset} label={preset} selected={form.reps === preset} onPress={() => set("reps", preset)} />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <Field label={tf("rest")}>
            <NumberInput value={form.rest} onChangeText={(v) => set("rest", v)} unit={t("exercises.secondsShort")} accessibilityLabel={tf("rest")} />
          </Field>
          <Field label={tf("duration")}>
            <NumberInput
              value={form.duration}
              onChangeText={(v) => set("duration", v)}
              unit={t("exercises.minutesShort")}
              accessibilityLabel={tf("duration")}
            />
          </Field>
        </View>
        <View style={styles.chips}>
          {REST_PRESETS.map((preset) => (
            <Chip key={preset} label={`${preset}`} selected={form.rest === String(preset)} onPress={() => set("rest", String(preset))} />
          ))}
        </View>
      </Card>

      <Card>
        <Field label={tf("notes")}>
          <Input value={form.notes} onChangeText={(v) => set("notes", v)} placeholder={tf("notesPlaceholderShort")} multiline maxLength={1000} />
        </Field>
      </Card>

      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <Button label={exercise ? tf("update") : tf("add")} loading={save.isPending} onPress={submit} />
      {exercise ? <Button label={t("exercises.delete.delete")} variant="danger" loading={remove.isPending} onPress={confirmDelete} /> : null}
    </ScrollView>
  );
}

/** Library names matching what's typed; picking one fills the name field. */
function LibrarySuggestions({ query, onPick }: { query: string; onPick: (name: string) => void }) {
  const t = useTranslations("workout.libraryPicker");
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const search = useExerciseSearch(debounced);
  const q = debounced.trim().toLowerCase();
  if (q.length < 2) return null;
  const results = (search.data ?? []).filter((e) => e.name.toLowerCase() !== query.trim().toLowerCase()).slice(0, 8);

  return (
    <View style={styles.suggestions}>
      <View style={styles.suggestionHead}>
        <AppText variant="small">{t("title")}</AppText>
        {search.isFetching ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
      </View>
      {search.data && results.length === 0 ? <AppText variant="small">{t("noResults")}</AppText> : null}
      {results.map((entry) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          onPress={() => onPick(entry.name)}
          style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.cardPressed }]}
        >
          <AppText style={styles.suggestionName}>{entry.name}</AppText>
          {entry.primaryMuscles.length > 0 || entry.equipment ? (
            <AppText variant="small">{[entry.primaryMuscles.join(", "), entry.equipment].filter(Boolean).join(" · ")}</AppText>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md },
  error: { color: colors.danger, textAlign: "center" },
  suggestions: { gap: spacing.xs },
  suggestionHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  suggestion: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  suggestionName: { fontWeight: "500" },
});
