import type {
  AiExerciseDto,
  AiExerciseVariationDto,
  AiJobDto,
  AiJobKind,
  AiJobSummaryDto,
  AiMealDto,
  AiQuotaDto,
  AiQuotaFeature,
  AiWeeklyPlanDto,
  CalendarWeekDto,
  ChatMessageDto,
  DailyGreetingDto,
  DeloadRecommendationDto,
  ExerciseTipsDto,
  ExerciseVariationResultDto,
  IdDto,
  MealVariationResultDto,
  SavedDailyMealSuggestionDto,
  SavedMealDto,
  SavedWeeklySuggestionDetailDto,
  SavedWeeklySuggestionDto,
} from "@fitmusc/shared/api/dto";
import type { AiJobCreateBody } from "@fitmusc/shared/api/schemas";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { aiWeekOf, isWeekdayToday, monthsOfMondays } from "@/lib/ai-weekly";
import { api } from "@/lib/api";
import { monthOf, todayStr, weekStartOf } from "@/lib/dates";

import { useInvalidateDay } from "./edit";

// AI features over /api/v1/ai. Long generations (daily meals, workout, week)
// are background jobs: POST /ai/jobs → poll GET /ai/jobs/[id] → apply.

export const aiKeys = {
  quota: ["ai.quota"] as const,
  greeting: ["ai.greeting"] as const,
  job: (id: string) => ["ai.job", id] as const,
  jobs: ["ai.jobs"] as const,
  seenJobs: ["ai.seenJobs"] as const,
  savedDaily: (planType: string | null) => ["ai.dailySuggestions", planType] as const,
  savedWeekly: ["ai.weeklySuggestions"] as const,
  savedWeeklyDetail: (id: number) => ["ai.weeklySuggestion", id] as const,
  savedMeals: ["meals.saved"] as const,
  tips: (name: string, notes: string | null, englishName: string | null) =>
    ["ai.exerciseTips", name, notes, englishName] as const,
  chat: ["ai.chat"] as const,
  deload: (date: string) => ["deload", date] as const,
  emptyWeeks: (year: number, month: number) => ["calendar.emptyWeeks", year, month] as const,
};

// ── Quota & greeting ─────────────────────────────────────────────────────────

export function useAiQuota() {
  return useQuery({ queryKey: aiKeys.quota, queryFn: () => api<AiQuotaDto>("/ai/quota") });
}

export function useQuota(feature: AiQuotaFeature) {
  return useAiQuota().data?.[feature] ?? null;
}

export function useInvalidateQuota() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: aiKeys.quota });
}

export function useGreeting() {
  return useQuery({
    queryKey: aiKeys.greeting,
    queryFn: () => api<DailyGreetingDto>("/ai/greeting"),
    // One message per day, cached on the server.
    staleTime: 60 * 60_000,
    retry: false,
  });
}

// ── Background jobs ──────────────────────────────────────────────────────────

export const isActiveJob = (job: { status: AiJobDto["status"] }) => job.status === "queued" || job.status === "running";

/** `details` of a 409 JOB_IN_PROGRESS — the job that is still running. */
export const jobInProgressDetails = z.object({ jobId: z.string() });

/**
 * Servers before the 6c deploy don't send `input`; keep what the app sent so
 * a job started in this session can still be applied. (A job opened without
 * it — a push after a restart — shows an error instead.)
 */
function withInput(job: AiJobDto, input: AiJobDto["input"] | undefined): AiJobDto {
  return job.input || !input ? job : ({ ...job, input } as AiJobDto);
}

export function useStartJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AiJobCreateBody) => api<AiJobDto>("/ai/jobs", { method: "POST", body }),
    onSuccess: (job, { kind: _kind, ...input }) => {
      qc.setQueryData(aiKeys.job(job.id), withInput(job, input as AiJobDto["input"]));
      void qc.invalidateQueries({ queryKey: aiKeys.jobs });
    },
  });
}

export function useAiJob(jobId: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: aiKeys.job(jobId),
    queryFn: async () => {
      const job = await api<AiJobDto>(`/ai/jobs/${jobId}`);
      return withInput(job, qc.getQueryData<AiJobDto>(aiKeys.job(jobId))?.input);
    },
    // A finished job never changes again.
    staleTime: (query) => (query.state.data && !isActiveJob(query.state.data) ? Infinity : 0),
    refetchInterval: (query) => (query.state.data && !isActiveJob(query.state.data) ? false : 3000),
    retry: false,
  });
}

/** Recent jobs (newest first) — the day / calendar banners find their job here. */
export function useAiJobs() {
  return useQuery({
    queryKey: aiKeys.jobs,
    queryFn: () => api<AiJobSummaryDto[]>("/ai/jobs?limit=10"),
    refetchInterval: (query) => (query.state.data?.some(isActiveJob) ? 5000 : false),
  });
}

/** Job ids whose result (or failure) was already looked at in this session. */
export function useSeenJobs() {
  const qc = useQueryClient();
  const seen = useQuery({
    queryKey: aiKeys.seenJobs,
    queryFn: () => new Set<string>(),
    initialData: () => new Set<string>(),
    staleTime: Infinity,
    gcTime: Infinity,
  }).data;
  const markSeen = (id: string) =>
    qc.setQueryData<Set<string>>(aiKeys.seenJobs, (old) => (old?.has(id) ? old : new Set([...(old ?? []), id])));
  return { seen, markSeen };
}

const RECENT_MS = 30 * 60_000;

/**
 * The newest job of `kind` matching `belongs`, while it runs or — once
 * finished — for 30 minutes until it is opened. Drives the "your plan is
 * being prepared / is ready" banners.
 */
export function useJobBanner(kind: AiJobKind, belongs: (job: AiJobSummaryDto) => boolean) {
  const jobs = useAiJobs();
  const { seen } = useSeenJobs();
  // `input` is missing on servers before the 6c deploy — no banner then.
  const job = jobs.data?.find((j) => j.kind === kind && j.input != null && belongs(j));
  if (!job) return null;
  if (isActiveJob(job)) return job;
  // Measured against when the list was fetched (it refetches on mount / focus), not a render-time clock.
  const finishedAt = job.finishedAt ? Date.parse(job.finishedAt) : 0;
  return !seen.has(job.id) && jobs.dataUpdatedAt - finishedAt < RECENT_MS ? job : null;
}

// ── Applying results ─────────────────────────────────────────────────────────

export function useApplyDailyMeals(dayId: number) {
  const invalidate = useInvalidateDay(dayId, "meals");
  return useMutation({
    mutationFn: (meals: AiMealDto[]) =>
      api("/ai/daily-meals/apply", { method: "POST", body: { dailyPlanId: dayId, meals } }),
    onSuccess: invalidate,
  });
}

export function useApplyWorkout(dayId: number) {
  const invalidate = useInvalidateDay(dayId, "exercises");
  return useMutation({
    mutationFn: (exercises: AiExerciseDto[]) =>
      api("/ai/workout/apply", { method: "POST", body: { dailyPlanId: dayId, exercises } }),
    onSuccess: invalidate,
  });
}

export function useApplyWeekly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      dateStr: string;
      plan: AiWeeklyPlanDto;
      applyMode?: "both" | "nutrition" | "workout";
      pastDows?: number[];
    }) => api("/ai/weekly/apply", { method: "POST", body }),
    // A week touches days, meals, exercises, the calendar and shopping — refetch whatever is on screen.
    onSuccess: () =>
      qc.invalidateQueries({
        predicate: ({ queryKey: [head] }) => !(typeof head === "string" && head.startsWith("ai.")),
      }),
  });
}

// ── Saved suggestions ────────────────────────────────────────────────────────

export function useSavedDailySuggestions(planType: string | null) {
  return useQuery({
    queryKey: aiKeys.savedDaily(planType),
    queryFn: () => {
      const query = planType ? `?planType=${planType}` : "";
      return api<SavedDailyMealSuggestionDto[]>(`/ai/daily-meal-suggestions${query}`);
    },
  });
}

export function useSaveDailySuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { planType: string; meals: AiMealDto[]; userNote?: string }) =>
      api<IdDto>("/ai/daily-meal-suggestions", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai.dailySuggestions"] }),
  });
}

export function useDeleteDailySuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/ai/daily-meal-suggestions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai.dailySuggestions"] }),
  });
}

export function useSavedWeekly(enabled = true) {
  return useQuery({
    queryKey: aiKeys.savedWeekly,
    queryFn: () => api<SavedWeeklySuggestionDto[]>("/ai/weekly-suggestions"),
    enabled,
  });
}

export function useSavedWeeklyDetail(id: number | null) {
  return useQuery({
    queryKey: aiKeys.savedWeeklyDetail(id ?? 0),
    queryFn: () => api<SavedWeeklySuggestionDetailDto>(`/ai/weekly-suggestions/${id}`),
    enabled: id != null,
    staleTime: Infinity,
  });
}

export function useDeleteSavedWeekly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/ai/weekly-suggestions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.savedWeekly }),
  });
}

// ── Meal variation ───────────────────────────────────────────────────────────

export type MealSuggestion = MealVariationResultDto["suggestions"][number];

export function useMealVariation() {
  const invalidateQuota = useInvalidateQuota();
  return useMutation({
    mutationFn: (body: {
      mealLabel: string;
      currentContent: string;
      calories: number | null;
      proteinG: string | null;
      carbsG: string | null;
      fatG: string | null;
      mealId: number;
      dailyPlanId: number;
      previousSuggestions: string[];
      userNote?: string;
    }) => api<MealVariationResultDto>("/ai/meal-variation", { method: "POST", body }),
    onSettled: invalidateQuota,
  });
}

/** The web's "saved meals" (the picker's saved tab reads the same list). */
export function useSavedMeals() {
  return useQuery({ queryKey: aiKeys.savedMeals, queryFn: () => api<SavedMealDto[]>("/saved-meals") });
}

export function useSaveMealSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mealLabel: string } & MealSuggestion) => api("/saved-meals", { method: "POST", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: aiKeys.savedMeals });
      void qc.invalidateQueries({ queryKey: ["meals.picker"] });
    },
  });
}

export function useDeleteSavedMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/saved-meals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: aiKeys.savedMeals });
      void qc.invalidateQueries({ queryKey: ["meals.picker"] });
    },
  });
}

// ── Exercises ────────────────────────────────────────────────────────────────

/** Form tips — served from a 30-day server cache when another user asked already. */
export function useExerciseTips(name: string, notes: string | null, englishName: string | null, enabled: boolean) {
  const invalidateQuota = useInvalidateQuota();
  return useQuery({
    queryKey: aiKeys.tips(name, notes, englishName),
    queryFn: async () => {
      try {
        return await api<ExerciseTipsDto>("/ai/exercise-tips", {
          method: "POST",
          body: { exerciseName: name, exerciseNotes: notes, englishName },
        });
      } finally {
        invalidateQuota();
      }
    },
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}

export function useExerciseVariation() {
  const invalidateQuota = useInvalidateQuota();
  return useMutation({
    mutationFn: (body: { exerciseId: number; userNote?: string; forceRefresh?: boolean }) =>
      api<ExerciseVariationResultDto>("/ai/exercise-variation", { method: "POST", body }),
    onSettled: invalidateQuota,
  });
}

export function useApplyExerciseVariation(dayId: number) {
  const invalidate = useInvalidateDay(dayId, "exercises");
  return useMutation({
    mutationFn: (body: { exerciseId: number; exercise: AiExerciseVariationDto }) =>
      api("/ai/exercise-variation/apply", { method: "POST", body }),
    onSuccess: invalidate,
  });
}

// ── Weekly plan helpers ──────────────────────────────────────────────────────

export function useCalendarWeek(date: string) {
  return useQuery({ queryKey: ["calendar.week", date], queryFn: () => api<CalendarWeekDto>(`/calendar/week?date=${date}`) });
}

function useEmptyWeeks(months: { year: number; month: number }[]) {
  const results = useQueries({
    queries: months.map(({ year, month }) => ({
      queryKey: aiKeys.emptyWeeks(year, month),
      queryFn: () => api<string[]>(`/calendar/empty-weeks?year=${year}&month=${month}`),
    })),
  });
  return {
    ready: results.every((r) => r.data !== undefined),
    mondays: results.flatMap((r) => r.data ?? []),
  };
}

/**
 * Web rule (use-month-gate.ts): while a week of the current month has no
 * plan, AI generation for later months stays closed.
 */
export function useMonthGate() {
  const today = todayStr();
  const current = monthOf(today);
  const empty = useEmptyWeeks([current]);
  return {
    ready: empty.ready,
    emptyWeekCount: empty.mondays.length,
    isBlocked: (date: string) => {
      if (empty.mondays.length === 0) return false;
      const { year, month } = monthOf(date);
      return year > current.year || (year === current.year && month > current.month);
    },
  };
}

/** Web rule (getEmptyWeeksBetween): a future week opens once every week before it, from this one on, has a plan. */
export function useEmptyWeekGap(targetMonday: string, enabled: boolean) {
  const currentMonday = weekStartOf(todayStr(), "monday");
  const months = enabled ? monthsOfMondays(currentMonday, targetMonday) : [];
  const empty = useEmptyWeeks(months);
  return empty.mondays.some((monday) => monday >= currentMonday && monday < targetMonday);
}

/** Whether the weekly AI plan can be made for the week of `date` (web: takvim page rules). */
export function useWeeklyAiGate(date: string, hasPlan: boolean) {
  const week = aiWeekOf(date);
  const monthGate = useMonthGate();
  const gap = useEmptyWeekGap(week.monday, week.isFuture);
  const monthBlocked = monthGate.isBlocked(date);
  return {
    week,
    /** The calendar shows the button: not a past week, month open, and the current week only on weekdays once it has a plan. */
    shown: !week.isPast && !monthBlocked && (week.isFuture || !hasPlan || isWeekdayToday()),
    /** A week before this one (from the current week on) still has no plan. */
    gap,
    monthBlocked,
    emptyWeekCount: monthGate.emptyWeekCount,
  };
}

export function useDeloadRecommendation(date: string, enabled: boolean) {
  return useQuery({
    queryKey: aiKeys.deload(date),
    queryFn: () => api<DeloadRecommendationDto>(`/deload?date=${date}`),
    enabled,
    staleTime: 5 * 60_000,
  });
}

// ── Coach chat ───────────────────────────────────────────────────────────────

export function useChatHistory() {
  return useQuery({
    queryKey: aiKeys.chat,
    queryFn: () => api<ChatMessageDto[]>("/ai/chat/history?limit=50"),
    staleTime: Infinity,
  });
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/ai/chat/history", { method: "DELETE" }),
    onSuccess: () => qc.setQueryData<ChatMessageDto[]>(aiKeys.chat, []),
  });
}
