import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslations } from "use-intl";

import {
  AiButton,
  ErrorBox,
  LocationPicker,
  MeasurementNudge,
  NoteInput,
  Panel,
  buildAiUserNote,
  useLocationNote,
  useWorkoutPrefs,
} from "@/components/ai";
import { ExerciseRows, useLaunchJob } from "@/components/ai-results";
import { Card, ErrorView, LoadingView, Screen, useErrorMessage } from "@/components/ui";
import { useDayExercises } from "@/hooks/plan";

/** Options for a new workout for the day (web: AiWorkoutModal). */
export default function AiWorkoutScreen() {
  const t = useTranslations("workout.aiModal");
  const tl = useTranslations("workout.list");
  const dayId = Number(useLocalSearchParams<{ dayId: string }>().dayId);
  const exercises = useDayExercises(dayId);
  const errorMessage = useErrorMessage();
  const job = useLaunchJob(errorMessage);
  const [prefs, setPrefs] = useWorkoutPrefs();
  const locationNote = useLocationNote();
  const [note, setNote] = useState("");

  if (exercises.isLoading) return <LoadingView />;
  if (!exercises.data) return <ErrorView error={exercises.error} onRetry={() => exercises.refetch()} />;
  const current = exercises.data;

  return (
    <>
      <Stack.Screen options={{ title: current.length > 0 ? tl("aiChangeTitle") : tl("aiCreateTitle") }} />
      <Screen>
        <Panel title={t("currentProgram")}>
          <ExerciseRows exercises={current} />
        </Panel>
        <MeasurementNudge />
        <Card>
          <LocationPicker prefs={prefs} onChange={setPrefs} />
          <NoteInput value={note} onChange={setNote} label={t("specialRequest")} placeholder={t("specialRequestPlaceholder")} />
        </Card>
        {job.error ? <ErrorBox message={job.error} /> : null}
        <AiButton
          label={t("getSuggestion")}
          feature="workout"
          loading={job.isPending}
          onPress={() =>
            job.launch({ kind: "workout", dailyPlanId: dayId, userNote: buildAiUserNote([locationNote(prefs), note]) })
          }
        />
      </Screen>
    </>
  );
}
