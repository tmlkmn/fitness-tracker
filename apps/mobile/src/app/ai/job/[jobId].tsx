import type { AiJobDto } from "@fitmusc/shared/api/dto";
import type { ApiErrorCode } from "@fitmusc/shared/api/errors";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { useLocale, useTranslations } from "use-intl";

import { AiButton, ErrorBox, JobProgress } from "@/components/ai";
import {
  DailyMealsResult,
  WeeklyResult,
  WorkoutResult,
  jobBody,
  useLaunchJob,
  useMarkJobSeen,
} from "@/components/ai-results";
import { AppText, ErrorView, LoadingView, Screen, useErrorMessage } from "@/components/ui";
import { aiKeys, isActiveJob, useAiJob } from "@/hooks/ai";
import { useDay } from "@/hooks/plan";
import { aiWeekOf } from "@/lib/ai-weekly";
import { ApiRequestError } from "@/lib/api";

/**
 * A background AI job: progress while it runs, then the result with
 * approve / new suggestion. Opened right after starting one, from a push, or
 * from the day / calendar banner.
 */
export default function AiJobScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useAiJob(jobId);

  if (job.isLoading) return <LoadingView />;
  if (!job.data) return <ErrorView error={job.error} onRetry={() => job.refetch()} />;
  // Without `input` (a server before the 6c deploy) the result can't be applied to its day.
  if (!job.data.input) return <ErrorView error={null} />;
  return <JobView job={job.data} />;
}

function useJobTitle(job: AiJobDto) {
  const t = useTranslations();
  if (job.kind === "daily-meals") return t("meals.aiModal.title");
  if (job.kind === "workout") return t("workout.list.aiChangeTitle");
  return t("calendar.aiWeekly.title");
}

/** "Tuesday, 12 November" — the day a daily job belongs to. */
function DaySubject({ dayId }: { dayId: number }) {
  const locale = useLocale() as Locale;
  const date = useDay(dayId).data?.date;
  if (!date) return null;
  return <AppText variant="muted">{formatDate(parseDateOnly(date), locale, { weekday: "long", day: "numeric", month: "long" })}</AppText>;
}

/** "Week of 10 November" — the (Monday-based) week of a weekly job. */
function WeekSubject({ date }: { date: string }) {
  const t = useTranslations("mobile.ai");
  const locale = useLocale() as Locale;
  const monday = formatDate(parseDateOnly(aiWeekOf(date).monday), locale, { day: "numeric", month: "long" });
  return <AppText variant="muted">{t("weekOf", { date: monday })}</AppText>;
}

function JobView({ job }: { job: AiJobDto }) {
  const router = useRouter();
  const qc = useQueryClient();
  const errorMessage = useErrorMessage();
  const title = useJobTitle(job);
  const tErrors = useTranslations("mobile.errors");
  const retry = useLaunchJob(errorMessage);
  const active = isActiveJob(job);
  useMarkJobSeen(job);

  // The quota is used when the generation finishes (usage is logged then).
  useEffect(() => {
    if (active) return;
    void qc.invalidateQueries({ queryKey: aiKeys.quota });
    void qc.invalidateQueries({ queryKey: aiKeys.jobs });
  }, [active, qc]);

  const done = () => router.back();
  const feature = job.kind === "daily-meals" ? "daily-meal" : job.kind;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen>
        {job.kind === "weekly" ? <WeekSubject date={job.input.dateStr} /> : <DaySubject dayId={job.input.dailyPlanId} />}
        {active ? <JobProgress job={job} /> : null}
        {job.status === "failed" ? (
          <>
            <ErrorBox message={errorMessage(new ApiRequestError(0, (job.error ?? "INTERNAL") as ApiErrorCode))} />
            {retry.error ? <ErrorBox message={retry.error} /> : null}
            <AiButton
              label={tErrors("retry")}
              feature={feature}
              loading={retry.isPending}
              onPress={() => retry.launch(jobBody(job))}
            />
          </>
        ) : null}
        {job.status === "succeeded" && job.kind === "daily-meals" ? (
          <DailyMealsResult job={job} errorMessage={errorMessage} onDone={done} />
        ) : null}
        {job.status === "succeeded" && job.kind === "workout" ? (
          <WorkoutResult job={job} errorMessage={errorMessage} onDone={done} />
        ) : null}
        {job.status === "succeeded" && job.kind === "weekly" ? (
          <WeeklyResult job={job} errorMessage={errorMessage} onDone={done} />
        ) : null}
      </Screen>
    </>
  );
}
