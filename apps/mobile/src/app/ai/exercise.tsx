import type { AiExerciseVariationDto, ExerciseDto } from "@fitmusc/shared/api/dto";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import {
  AiButton,
  AiDisclaimer,
  ErrorBox,
  LocationPicker,
  Markdown,
  NoteInput,
  Panel,
  buildAiUserNote,
  useLocationNote,
  useWorkoutPrefs,
} from "@/components/ai";
import { useExerciseDetail } from "@/components/ai-results";
import { AppText, Button, Card, ErrorView, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import { useApplyExerciseVariation, useExerciseTips, useExerciseVariation } from "@/hooks/ai";
import { useDayExercises } from "@/hooks/plan";
import { colors, spacing } from "@/lib/theme";

type Tab = "alternatives" | "tips";

/** AI for one exercise: alternatives to swap it for, and form tips (web: ExerciseAlternativeModal + ExerciseFormTips). */
export default function AiExerciseScreen() {
  const params = useLocalSearchParams<{ dayId: string; exerciseId: string }>();
  const dayId = Number(params.dayId);
  const exerciseId = Number(params.exerciseId);
  const exercises = useDayExercises(dayId);
  if (exercises.isLoading) return <LoadingView />;
  const exercise = exercises.data?.find((e) => e.id === exerciseId);
  if (!exercise) return <ErrorView error={exercises.error} onRetry={() => exercises.refetch()} />;
  return <ExerciseAi dayId={dayId} exercise={exercise} />;
}

function ExerciseAi({ dayId, exercise }: { dayId: number; exercise: ExerciseDto }) {
  const t = useTranslations();
  const detail = useExerciseDetail();
  // Like the web, a completed exercise only gets tips.
  const canSwap = !exercise.isCompleted;
  const [tab, setTab] = useState<Tab>(canSwap ? "alternatives" : "tips");

  return (
    <>
      <Stack.Screen options={{ title: exercise.name }} />
      <Screen>
        <Panel title={t("workout.alternativeModal.originalExercise")}>
          <AppText style={{ fontWeight: "600" }}>{exercise.name}</AppText>
          {detail(exercise) ? <AppText variant="small">{detail(exercise)}</AppText> : null}
        </Panel>
        {canSwap ? (
          <Segmented
            options={[
              { value: "alternatives", label: t("workout.alternativeModal.title") },
              { value: "tips", label: t("mobile.ai.formTips") },
            ]}
            value={tab}
            onChange={setTab}
          />
        ) : null}
        {tab === "alternatives" ? <Alternatives dayId={dayId} exercise={exercise} /> : <Tips exercise={exercise} />}
      </Screen>
    </>
  );
}

function Alternatives({ dayId, exercise }: { dayId: number; exercise: ExerciseDto }) {
  const t = useTranslations("workout.alternativeModal");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const detail = useExerciseDetail();
  const variation = useExerciseVariation();
  const apply = useApplyExerciseVariation(dayId);
  const [prefs, setPrefs] = useWorkoutPrefs();
  const locationNote = useLocationNote();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generate = (forceRefresh: boolean) => {
    setError(null);
    variation.mutate(
      { exerciseId: exercise.id, userNote: buildAiUserNote([locationNote(prefs), note]), forceRefresh },
      { onError: (err) => setError(errorMessage(err)) },
    );
  };
  const use = (alternative: AiExerciseVariationDto) => {
    setError(null);
    apply.mutate(
      { exerciseId: exercise.id, exercise: alternative },
      { onSuccess: () => router.back(), onError: (err) => setError(errorMessage(err)) },
    );
  };

  const result = variation.data;
  return (
    <>
      {error ? <ErrorBox message={error} /> : null}
      {result ? (
        <>
          <View style={styles.head}>
            <AppText variant="heading" style={{ flex: 1 }}>
              {t("alternativesCount")}
            </AppText>
            {result.fromCache ? <AppText variant="small">{t("fromCache")}</AppText> : null}
          </View>
          {result.alternatives.length === 0 ? <AppText variant="muted">{t("noResults")}</AppText> : null}
          {result.alternatives.map((alternative, i) => (
            <Panel key={`${i}-${alternative.name}`} title={alternative.name} tone="suggested">
              {detail(alternative) ? <AppText variant="small">{detail(alternative)}</AppText> : null}
              {alternative.notes ? <AppText variant="muted">{alternative.notes}</AppText> : null}
              <Button label={t("useAlternative")} loading={apply.isPending && apply.variables?.exercise === alternative} disabled={apply.isPending} onPress={() => use(alternative)} />
            </Panel>
          ))}
          <AiButton
            label={t("newSuggestion")}
            feature="exercise"
            variant="secondary"
            loading={variation.isPending}
            disabled={apply.isPending}
            onPress={() => generate(true)}
          />
          <AiDisclaimer />
        </>
      ) : (
        <>
          <Card>
            <LocationPicker prefs={prefs} onChange={setPrefs} />
            <NoteInput value={note} onChange={setNote} label={t("specialRequest")} placeholder={t("specialRequestPlaceholder")} />
          </Card>
          {variation.isPending ? <AppText variant="muted">{t("generating")}</AppText> : null}
          <AiButton label={t("getSuggestion")} feature="exercise" loading={variation.isPending} onPress={() => generate(false)} />
        </>
      )}
    </>
  );
}

function Tips({ exercise }: { exercise: ExerciseDto }) {
  const errorMessage = useErrorMessage();
  const tips = useExerciseTips(exercise.name, exercise.notes, exercise.englishName, true);
  if (tips.isLoading) return <LoadingView />;
  if (tips.error) return <ErrorBox message={errorMessage(tips.error)} />;
  if (!tips.data?.tips) return null;
  return (
    <>
      <Card style={{ backgroundColor: colors.cardPressed }}>
        <Markdown>{tips.data.tips}</Markdown>
      </Card>
      <AiDisclaimer />
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
