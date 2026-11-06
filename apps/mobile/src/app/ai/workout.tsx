import { EXERCISE_SECTIONS } from "@fitmusc/shared/api/schemas";
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
  ProfileMissing,
  buildAiUserNote,
  missingProfileFields,
  useLocationNote,
  useWorkoutPrefs,
} from "@/components/ai";
import { ExerciseRows, useLaunchJob } from "@/components/ai-results";
import { Card, ErrorView, LoadingView, Screen, useErrorMessage } from "@/components/ui";
import { useDayExercises } from "@/hooks/plan";
import { useProfile } from "@/hooks/wellness";

type Section = (typeof EXERCISE_SECTIONS)[number];
const isSection = (value: string | undefined): value is Section => EXERCISE_SECTIONS.includes(value as Section);

/**
 * Options for a new workout for the day (web: AiWorkoutModal) — or, with
 * `?section=`, for one section of it (web: WorkoutSection's ✦). Both run as a
 * "workout" job; a section job only touches that section when applied.
 */
export default function AiWorkoutScreen() {
  const t = useTranslations("workout.aiModal");
  const tl = useTranslations("workout.list");
  const ts = useTranslations("workout.section");
  const params = useLocalSearchParams<{ dayId: string; section?: string }>();
  const dayId = Number(params.dayId);
  const section = isSection(params.section) ? params.section : null;
  const exercises = useDayExercises(dayId);
  const profile = useProfile();
  const errorMessage = useErrorMessage();
  const job = useLaunchJob(errorMessage);
  const [prefs, setPrefs] = useWorkoutPrefs();
  const locationNote = useLocationNote();
  const [note, setNote] = useState("");

  if (exercises.isLoading || (section && profile.isLoading)) return <LoadingView />;
  if (!exercises.data) return <ErrorView error={exercises.error} onRetry={() => exercises.refetch()} />;

  const current = section ? exercises.data.filter((e) => e.section === section) : exercises.data;
  const sectionLabel = current[0]?.sectionLabel ?? section;
  let title = current.length > 0 ? tl("aiChangeTitle") : tl("aiCreateTitle");
  if (section) title = ts("aiChangeSection", { section: sectionLabel ?? section });
  // Like the web, a section swap needs the required profile fields first.
  const missing = section && profile.data ? missingProfileFields(profile.data) : [];

  const generate = () =>
    job.launch({
      kind: "workout",
      dailyPlanId: dayId,
      userNote: buildAiUserNote([locationNote(prefs), note]),
      ...(section && sectionLabel ? { section, sectionLabel } : {}),
    });

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen>
        <Panel title={t("currentProgram")}>
          <ExerciseRows exercises={current} />
        </Panel>
        {missing.length > 0 ? (
          <ProfileMissing missing={missing} />
        ) : (
          <>
            <MeasurementNudge />
            <Card>
              <LocationPicker prefs={prefs} onChange={setPrefs} />
              <NoteInput value={note} onChange={setNote} label={t("specialRequest")} placeholder={t("specialRequestPlaceholder")} />
            </Card>
            {job.error ? <ErrorBox message={job.error} /> : null}
            <AiButton label={t("getSuggestion")} feature="workout" loading={job.isPending} onPress={generate} />
          </>
        )}
      </Screen>
    </>
  );
}
