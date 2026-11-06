/**
 * Background AI jobs for the mobile app (`/api/v1/ai/jobs`).
 *
 * Plan generation takes minutes (weekly up to ~13), and iOS cuts a request
 * off once the app is backgrounded. So POST returns 202 + a job id right after
 * the quota and ownership checks, the generation runs in `after()` within the
 * route's 800s maxDuration, and the app polls GET /ai/jobs/[id] (a push with
 * `tag: "ai-job"` also arrives when it finishes).
 *
 * The runners are the same code the web uses — the server actions for daily
 * meals / workout, `generateWeeklyPlan` for the week — so usage logging and
 * the quota stay identical. Request APIs (headers → session) work inside
 * `after()` in route handlers, which the actions rely on.
 */

import "server-only";
import { after } from "next/server";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { aiJobs } from "@/db/schema";
import type { AiJobCreateBody } from "@fitmusc/shared/api/schemas";
import type {
  AiJobDto,
  AiJobKind,
  AiJobSummaryDto,
  DailyMealsJobResultDto,
  WeeklyJobProgressDto,
  WeeklyJobResultDto,
  WorkoutJobResultDto,
} from "@fitmusc/shared/api/dto";
import type { ApiErrorCode } from "@fitmusc/shared/api/errors";
import { getUserLocale, type Locale } from "@fitmusc/shared/locale";
import { ApiError, classifyError, type ApiUser, type JsonSource } from "@/lib/api/handler";
import { checkRateLimit, type AIFeature } from "@/lib/ai";
import { verifyDailyPlanOwnership } from "@/lib/ownership";
import { generateDailyMeals } from "@/actions/ai-meals";
import { generateWorkoutReplacement } from "@/actions/ai-workout";
import { generateWeeklyPlan, type WeeklyGenerationStep } from "@/lib/ai-weekly-generate";
import { sendMobilePush } from "@/lib/notifications";

// Past the route's 800s maxDuration: a job still unfinished by then was cut
// off with its function instance and will never write a result.
const STALE_AFTER_MS = 15 * 60_000;
// Results are only needed until applied; weekly plans are also kept as saved
// suggestions (GET /ai/weekly-suggestions).
const KEEP_FOR_MS = 7 * 24 * 3600_000;

const ACTIVE = ["queued", "running"];

const QUOTA_FEATURE: Record<AiJobKind, AIFeature> = {
  "daily-meals": "daily-meal",
  workout: "workout",
  weekly: "weekly",
};

// User-facing errors of the weekly service (src/lib/ai-weekly-service.ts) —
// the model ran but produced nothing usable.
const WEEKLY_EMPTY_PLAN_ERRORS = new Set([
  "AI bu hafta için anlamlı bir plan üretemedi. Lütfen birkaç dakika sonra tekrar deneyin.",
  "AI antrenman üretemedi; beslenme adımı atlandı. Lütfen tekrar deneyin.",
]);

type AiJobRow = typeof aiJobs.$inferSelect;

function toSummary(row: AiJobRow): JsonSource<AiJobSummaryDto> {
  return {
    id: row.id,
    kind: row.kind as AiJobKind,
    status: row.status as AiJobSummaryDto["status"],
    error: row.error as ApiErrorCode | null,
    createdAt: row.createdAt,
    finishedAt: row.finishedAt,
  };
}

// progress/result are jsonb written by runJob below, in the DTO shapes.
function toDto(row: AiJobRow): JsonSource<AiJobDto> {
  return { ...toSummary(row), progress: row.progress, result: row.result } as JsonSource<AiJobDto>;
}

/** Marks this user's jobs that outlived the function instance as failed. */
async function expireStaleJobs(userId: string): Promise<void> {
  await db
    .update(aiJobs)
    .set({ status: "failed", error: "JOB_TIMEOUT", finishedAt: new Date() })
    .where(
      and(
        eq(aiJobs.userId, userId),
        inArray(aiJobs.status, ACTIVE),
        lt(aiJobs.createdAt, new Date(Date.now() - STALE_AFTER_MS)),
      ),
    );
}

function isUniqueViolation(err: unknown): boolean {
  // drizzle wraps the driver error; the Postgres code sits on a `cause`.
  for (let e: unknown = err; e instanceof Error; e = e.cause) {
    if ((e as Error & { code?: unknown }).code === "23505") return true;
  }
  return false;
}

export async function startAiJob(user: ApiUser, body: AiJobCreateBody): Promise<JsonSource<AiJobDto>> {
  // Fail fast while the app is still waiting: quota, cooldown, ownership.
  await checkRateLimit(user.id, QUOTA_FEATURE[body.kind]);
  if (body.kind !== "weekly") await verifyDailyPlanOwnership(body.dailyPlanId, user.id);

  await expireStaleJobs(user.id);
  await db
    .delete(aiJobs)
    .where(and(eq(aiJobs.userId, user.id), lt(aiJobs.createdAt, new Date(Date.now() - KEEP_FOR_MS))));

  let row: AiJobRow;
  try {
    const { kind, ...input } = body;
    [row] = await db.insert(aiJobs).values({ userId: user.id, kind, input }).returning();
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // ai_jobs_one_active_idx: this kind is already running for the user.
    const [active] = await db
      .select({ id: aiJobs.id })
      .from(aiJobs)
      .where(and(eq(aiJobs.userId, user.id), eq(aiJobs.kind, body.kind), inArray(aiJobs.status, ACTIVE)));
    throw new ApiError(409, "JOB_IN_PROGRESS", active ? { jobId: active.id } : undefined);
  }

  after(() => runJob(row.id, user, body));
  return toDto(row);
}

export async function getAiJob(userId: string, jobId: string): Promise<JsonSource<AiJobDto> | null> {
  await expireStaleJobs(userId);
  const [row] = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.userId, userId)));
  return row ? toDto(row) : null;
}

/** Newest first — lets the app pick up a job it lost track of (e.g. after a restart). */
export async function listAiJobs(userId: string, limit = 10): Promise<JsonSource<AiJobSummaryDto>[]> {
  await expireStaleJobs(userId);
  const rows = await db
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.userId, userId))
    .orderBy(desc(aiJobs.createdAt))
    .limit(limit);
  return rows.map(toSummary);
}

async function runJob(jobId: string, user: ApiUser, body: AiJobCreateBody): Promise<void> {
  const locale = getUserLocale(user);
  try {
    await db.update(aiJobs).set({ status: "running", startedAt: new Date() }).where(eq(aiJobs.id, jobId));
    const result = await execute(jobId, user, locale, body);
    await db
      .update(aiJobs)
      .set({ status: "succeeded", result, finishedAt: new Date() })
      .where(eq(aiJobs.id, jobId));
    await notify(user.id, locale, body.kind, jobId, true);
  } catch (err) {
    const code = jobErrorCode(err);
    console.error(`[ai-jobs] ${body.kind} job failed (${code}):`, err);
    try {
      await db
        .update(aiJobs)
        .set({ status: "failed", error: code, finishedAt: new Date() })
        .where(eq(aiJobs.id, jobId));
    } catch (writeErr) {
      // The stale sweep marks it JOB_TIMEOUT later.
      console.error("[ai-jobs] could not store the failure:", writeErr);
    }
    await notify(user.id, locale, body.kind, jobId, false);
  }
}

async function execute(
  jobId: string,
  user: ApiUser,
  locale: Locale,
  body: AiJobCreateBody,
): Promise<JsonSource<DailyMealsJobResultDto | WorkoutJobResultDto | WeeklyJobResultDto>> {
  switch (body.kind) {
    case "daily-meals": {
      const result: JsonSource<DailyMealsJobResultDto> = await generateDailyMeals(body.dailyPlanId, body.userNote);
      return result;
    }
    case "workout": {
      const result: JsonSource<WorkoutJobResultDto> = await generateWorkoutReplacement(body.dailyPlanId, body.userNote);
      return result;
    }
    case "weekly": {
      const progress = createProgressWriter(jobId);
      try {
        const suggestedPlan = await generateWeeklyPlan(user.id, locale, body, progress.report);
        const result: JsonSource<WeeklyJobResultDto> = { suggestedPlan };
        return result;
      } finally {
        await progress.flushed();
      }
    }
  }
}

/** Folds the weekly steps into the leg-by-leg state the app renders (same as the web overlay). */
function createProgressWriter(jobId: string) {
  let state: WeeklyJobProgressDto = { phase: "profile", workout: "pending", nutrition: "pending" };
  // Writes run one after another so an older state never lands last.
  let chain: Promise<unknown> = Promise.resolve();

  const report = (ev: WeeklyGenerationStep) => {
    if (ev.step === "profile") {
      state = { ...state, phase: "profile" };
    } else if (ev.step === "merging") {
      state = {
        phase: "merging",
        workout: state.workout === "pending" ? "pending" : "done",
        nutrition: state.nutrition === "pending" ? "pending" : "done",
      };
    } else {
      const leg = ev.phase === "done" ? "done" : ev.phase === "retry" ? "retrying" : "active";
      state = { ...state, phase: "generating", [ev.step]: leg };
    }
    const snapshot = state;
    chain = chain
      .then(() => db.update(aiJobs).set({ progress: snapshot }).where(eq(aiJobs.id, jobId)))
      .catch((err) => console.error("[ai-jobs] progress write failed:", err));
  };

  return { report, flushed: () => chain };
}

function jobErrorCode(err: unknown): ApiErrorCode {
  const message = err instanceof Error ? err.message : "";
  if (WEEKLY_EMPTY_PLAN_ERRORS.has(message)) return "AI_EMPTY_RESPONSE";
  // Weekly service internals ("[nutrition] … timeout") — the web shows a generic error too.
  if (message.startsWith("[")) return "AI_UNAVAILABLE";
  return classifyError(err).code;
}

const PUSH_TEXT: Record<Locale, Record<AiJobKind | "failed", { title: string; body: string }>> = {
  tr: {
    "daily-meals": { title: "Öğün önerin hazır", body: "Yeni günlük öğünlerini incelemek için dokun." },
    workout: { title: "Antrenman önerin hazır", body: "Yeni antrenmanını incelemek için dokun." },
    weekly: { title: "Haftalık planın hazır", body: "Yeni haftalık planını incelemek için dokun." },
    failed: { title: "Plan oluşturulamadı", body: "Bir sorun oluştu, lütfen tekrar dene." },
  },
  en: {
    "daily-meals": { title: "Your meal suggestions are ready", body: "Tap to review your new meals for the day." },
    workout: { title: "Your workout suggestion is ready", body: "Tap to review your new workout." },
    weekly: { title: "Your weekly plan is ready", body: "Tap to review your new weekly plan." },
    failed: { title: "Couldn't create the plan", body: "Something went wrong, please try again." },
  },
};

async function notify(userId: string, locale: Locale, kind: AiJobKind, jobId: string, ok: boolean) {
  const text = PUSH_TEXT[locale][ok ? kind : "failed"];
  await sendMobilePush(userId, { ...text, tag: "ai-job", jobId });
}
