import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  AiExerciseDto,
  AiJobDto,
  AiMealDto,
  AiWeeklyDayDto,
  AiWeeklyPlanDto,
} from "@fitmusc/shared/api/dto";
import type { AiJobCreateBody } from "@fitmusc/shared/api/schemas";
import type { Locale } from "@fitmusc/shared/locale";
import { coerceMealLabel, getLocalizedMealLabel } from "@fitmusc/shared/meal-labels";
import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import {
  isActiveJob,
  jobInProgressDetails,
  useApplyDailyMeals,
  useApplyWeekly,
  useApplyWorkout,
  useApplyWorkoutSection,
  useCalendarWeek,
  useSaveDailySuggestion,
  useSeenJobs,
  useStartJob,
} from "@/hooks/ai";
import { useDay } from "@/hooks/plan";
import { aiWeekOf } from "@/lib/ai-weekly";
import { ApiRequestError } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";

import { AiButton, AiDisclaimer, ErrorBox, Panel, Warnings } from "./ai";
import { PlanTypeIcon } from "./plan-type";
import { AppText, Banner, Button, Card } from "./ui";

// ── Starting a job ───────────────────────────────────────────────────────────

/**
 * Starts a background job and swaps the current screen for its progress
 * screen. A 409 JOB_IN_PROGRESS opens the job that is already running.
 */
export function useLaunchJob(errorMessage: (err: unknown) => string) {
  const router = useRouter();
  const start = useStartJob();
  const [error, setError] = useState<string | null>(null);
  const open = (jobId: string) => router.replace({ pathname: "/ai/job/[jobId]", params: { jobId } });
  const launch = (body: AiJobCreateBody) => {
    setError(null);
    start.mutate(body, {
      onSuccess: (job) => open(job.id),
      onError: (err) => {
        const running =
          err instanceof ApiRequestError && err.code === "JOB_IN_PROGRESS" ? jobInProgressDetails.safeParse(err.details) : null;
        if (running?.success) open(running.data.jobId);
        else setError(errorMessage(err));
      },
    });
  };
  return { launch, isPending: start.isPending, error };
}

/** What POST /ai/jobs got the first time — "new suggestion" runs it again. */
export function jobBody(job: AiJobDto): AiJobCreateBody {
  // `input` is the validated body the server stored, so it parses again.
  return { kind: job.kind, ...job.input } as AiJobCreateBody;
}

// ── Rows ─────────────────────────────────────────────────────────────────────

export function MealRows({ meals }: { meals: AiMealDto[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("meals.aiModal");
  if (meals.length === 0) return <AppText variant="small">{t("noMeals")}</AppText>;
  return (
    <View style={styles.rows}>
      {meals.map((meal, i) => (
        <View key={i} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="small">
              {meal.mealTime} · <AppText style={styles.rowTitle}>{getLocalizedMealLabel(coerceMealLabel(meal.mealLabel), locale)}</AppText>
            </AppText>
            <AppText variant="muted" numberOfLines={3}>
              {meal.content}
            </AppText>
          </View>
          {meal.calories ? <AppText variant="small">{meal.calories} kcal</AppText> : null}
        </View>
      ))}
    </View>
  );
}

const totalKcal = (meals: { calories: number | null }[]) => meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

type ExerciseLike = Pick<AiExerciseDto, "name" | "sets" | "reps" | "restSeconds" | "durationMinutes"> & {
  sectionLabel?: string;
};

export function useExerciseDetail() {
  const t = useTranslations("workout.aiModal");
  return (e: Omit<ExerciseLike, "name" | "sectionLabel">) =>
    [
      e.sets && e.reps ? `${e.sets}×${e.reps}` : null,
      e.durationMinutes ? `${e.durationMinutes} ${t("minutesShort")}` : null,
      e.restSeconds ? `${e.restSeconds}${t("secondsShort")}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
}

/** Grouped by section label when there is more than one (web: AiWorkoutModal's ExerciseList). */
export function ExerciseRows({ exercises }: { exercises: ExerciseLike[] }) {
  const t = useTranslations("workout.aiModal");
  const detail = useExerciseDetail();
  if (exercises.length === 0) return <AppText variant="small">{t("noExercises")}</AppText>;
  const groups: { label: string; items: ExerciseLike[] }[] = [];
  for (const exercise of exercises) {
    const label = exercise.sectionLabel ?? t("exercisesSection");
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(exercise);
    else groups.push({ label, items: [exercise] });
  }
  return (
    <View style={{ gap: spacing.md }}>
      {groups.map((group) => (
        <View key={group.label} style={styles.rows}>
          {groups.length > 1 ? <AppText style={styles.section}>{group.label}</AppText> : null}
          {group.items.map((exercise, i) => (
            <View key={i} style={styles.row}>
              <AppText style={[styles.rowTitle, { flex: 1 }]}>{exercise.name}</AppText>
              <AppText variant="small">{detail(exercise)}</AppText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Weekly preview ───────────────────────────────────────────────────────────

const PLAN_TYPE_KEYS = ["workout", "swimming", "rest", "nutrition"] as const;

function WeeklyDay({ day }: { day: AiWeeklyDayDto }) {
  const t = useTranslations("calendar.aiWeekly");
  const tp = useTranslations("dashboard.planTypes");
  const [open, setOpen] = useState(false);
  const typeKey = PLAN_TYPE_KEYS.find((k) => k === day.planType);
  const kcal = totalKcal(day.meals);
  return (
    <View style={styles.day}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={styles.dayHead}
      >
        <PlanTypeIcon planType={day.planType} size={16} />
        <View style={{ flex: 1 }}>
          <AppText style={styles.rowTitle}>
            {day.dayName}
            {typeKey ? <AppText variant="small"> · {tp(typeKey)}</AppText> : null}
          </AppText>
          {day.workoutTitle ? <AppText variant="small">{day.workoutTitle}</AppText> : null}
        </View>
        {kcal > 0 ? <AppText variant="small">{kcal} kcal</AppText> : null}
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
          {day.meals.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <AppText style={styles.section}>{t("mealsHeading")}</AppText>
              <MealRows meals={day.meals} />
            </View>
          ) : null}
          {day.exercises.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <AppText style={styles.section}>
                {t("exercisesHeading")} {t("moveCount", { count: day.exercises.length })}
              </AppText>
              <ExerciseRows exercises={day.exercises} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function WeeklyPreview({ plan }: { plan: AiWeeklyPlanDto }) {
  return (
    <Card>
      <View style={{ gap: 2 }}>
        <AppText variant="heading">{plan.weekTitle}</AppText>
        <AppText variant="small">{plan.phase}</AppText>
      </View>
      {plan.strategyNote ? <AppText variant="muted">{plan.strategyNote}</AppText> : null}
      {plan.notes ? <AppText variant="muted">{plan.notes}</AppText> : null}
      {[...plan.days]
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map((day) => (
          <WeeklyDay key={day.dayOfWeek} day={day} />
        ))}
    </Card>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────

interface ResultProps<K extends AiJobDto["kind"]> {
  job: Extract<AiJobDto, { kind: K }>;
  errorMessage: (err: unknown) => string;
  onDone: () => void;
}

function ResultActions({
  job,
  errorMessage,
  applying,
  onApply,
  extra,
  applyError,
  canApply = true,
}: {
  job: AiJobDto;
  errorMessage: (err: unknown) => string;
  applying: boolean;
  onApply: () => void;
  extra?: ReactNode;
  applyError: string | null;
  canApply?: boolean;
}) {
  const t = useTranslations("meals.aiModal");
  const again = useLaunchJob(errorMessage);
  const feature = job.kind === "daily-meals" ? "daily-meal" : job.kind;
  return (
    <>
      {again.error ? <ErrorBox message={again.error} /> : null}
      {applyError ? <ErrorBox message={applyError} /> : null}
      <Button label={t("approve")} loading={applying} disabled={again.isPending || !canApply} onPress={onApply} />
      <AiButton
        label={t("newSuggestion")}
        feature={feature}
        variant="secondary"
        loading={again.isPending}
        disabled={applying}
        onPress={() => again.launch(jobBody(job))}
      />
      {extra}
      <AiDisclaimer />
    </>
  );
}

export function DailyMealsResult({ job, errorMessage, onDone }: ResultProps<"daily-meals">) {
  const t = useTranslations("meals.aiModal");
  const dayId = job.input.dailyPlanId;
  const day = useDay(dayId);
  const apply = useApplyDailyMeals(dayId);
  const save = useSaveDailySuggestion();
  const [applyError, setApplyError] = useState<string | null>(null);
  const result = job.result;
  if (!result) return null;
  const planType = day.data?.planType ?? "rest";
  return (
    <>
      <Panel title={t("currentMeals")} right={`${totalKcal(result.currentMeals)} kcal`}>
        <MealRows meals={result.currentMeals} />
      </Panel>
      <Warnings title={t("warningsTitle")} items={result.validationWarnings} />
      <Panel title={t("suggestedMeals")} right={`${totalKcal(result.suggestedMeals)} kcal`} tone="suggested">
        <MealRows meals={result.suggestedMeals} />
      </Panel>
      <ResultActions
        job={job}
        errorMessage={errorMessage}
        applying={apply.isPending}
        applyError={applyError}
        onApply={() => {
          setApplyError(null);
          apply.mutate(result.suggestedMeals, { onSuccess: onDone, onError: (err) => setApplyError(errorMessage(err)) });
        }}
        extra={
          <Button
            label={save.isSuccess ? `✓ ${t("saveToFavorites")}` : t("saveToFavorites")}
            variant="ghost"
            loading={save.isPending}
            disabled={save.isSuccess || apply.isPending}
            onPress={() =>
              save.mutate(
                { planType, meals: result.suggestedMeals, userNote: job.input.userNote },
                { onError: (err) => setApplyError(errorMessage(err)) },
              )
            }
          />
        }
      />
    </>
  );
}

export function WorkoutResult({ job, errorMessage, onDone }: ResultProps<"workout">) {
  const t = useTranslations("workout.aiModal");
  const dayId = job.input.dailyPlanId;
  const section = job.input.section ?? null;
  const applyDay = useApplyWorkout(dayId);
  const applySection = useApplyWorkoutSection(dayId);
  const [applyError, setApplyError] = useState<string | null>(null);
  const result = job.result;
  if (!result) return null;
  // A section job replaces only its section. A server before the section
  // jobs answers with the whole day — keep that section's part of it.
  const inSection = <T extends { section: string }>(list: T[]) => (section ? list.filter((e) => e.section === section) : list);
  const current = inSection(result.currentExercises);
  const suggested = inSection(result.suggestedExercises);
  const done = { onSuccess: onDone, onError: (err: unknown) => setApplyError(errorMessage(err)) };
  return (
    <>
      <Panel title={t("currentProgram")}>
        <ExerciseRows exercises={current} />
      </Panel>
      <Warnings title={t("warningsTitle")} items={result.validationWarnings} />
      <Panel title={t("suggestedProgram")} tone="suggested">
        <ExerciseRows exercises={suggested} />
      </Panel>
      <ResultActions
        job={job}
        errorMessage={errorMessage}
        applying={applyDay.isPending || applySection.isPending}
        applyError={applyError}
        canApply={!section || suggested.length > 0}
        onApply={() => {
          setApplyError(null);
          if (section) applySection.mutate({ section, exercises: suggested }, done);
          else applyDay.mutate(suggested, done);
        }}
      />
    </>
  );
}

/** Applies a generated or saved week to the week of `date`, keeping its past days. */
export function useApplyWeekTo(date: string) {
  const apply = useApplyWeekly();
  const week = useCalendarWeek(date);
  return {
    hasPlan: week.data?.weeklyPlan != null,
    isPending: apply.isPending,
    apply: (
      plan: AiWeeklyPlanDto,
      applyMode: "both" | "nutrition" | "workout" | undefined,
      callbacks: { onSuccess: () => void; onError: (err: unknown) => void },
    ) =>
      // pastDows are recomputed at apply time: a plan generated yesterday must
      // not overwrite a day that has passed since.
      apply.mutate({ dateStr: date, plan, applyMode, pastDows: aiWeekOf(date).pastDows }, callbacks),
  };
}

export function WeeklyResult({ job, errorMessage, onDone }: ResultProps<"weekly">) {
  const t = useTranslations("calendar.aiWeekly");
  const apply = useApplyWeekTo(job.input.dateStr);
  const [applyError, setApplyError] = useState<string | null>(null);
  const plan = job.result?.suggestedPlan;
  if (!plan) return null;
  return (
    <>
      {apply.hasPlan ? <Banner icon={<Ionicons name="warning-outline" size={14} color={colors.warning} />}>{t("willReplace")}</Banner> : null}
      <WeeklyPreview plan={plan} />
      <ResultActions
        job={job}
        errorMessage={errorMessage}
        applying={apply.isPending}
        applyError={applyError}
        onApply={() => {
          setApplyError(null);
          apply.apply(plan, job.input.generateMode, { onSuccess: onDone, onError: (err) => setApplyError(errorMessage(err)) });
        }}
      />
    </>
  );
}

/** Marks a finished job as looked at, so its "ready" banner goes away. */
export function useMarkJobSeen(job: AiJobDto | undefined) {
  const { markSeen } = useSeenJobs();
  const finishedId = job && !isActiveJob(job) ? job.id : null;
  useEffect(() => {
    if (finishedId) markSeen(finishedId);
  }, [finishedId, markSeen]);
}

const styles = StyleSheet.create({
  rows: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowTitle: { fontWeight: "600", color: colors.text, fontSize: 14 },
  section: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  day: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  dayHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.sm },
});
