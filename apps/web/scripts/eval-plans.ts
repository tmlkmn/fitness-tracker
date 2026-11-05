/**
 * Plan-quality eval harness — weekly plan, daily meals, daily workout.
 *
 *   npm run eval:plans -- --label baseline [--reps 1]
 *       [--effort high|xhigh] [--flows weekly,daily-meal,workout] [--dry-run]
 *   npm run eval:plans -- --compare baseline,phase2
 *
 * Runs the same generation cores the app uses against the admin test account,
 * and persists NOTHING in the app: no saveAiSuggestion/apply, no logAiUsage,
 * no rate-limit rows. Scores with the app's own validators and writes
 * eval-results/<label>-<timestamp>.json. `--dry-run` loads context and builds
 * prompts (DB reads only) without calling the API.
 *
 * Every run spends real API money: a cumulative budget is kept in
 * eval-results/spend.json and a run that would exceed it is refused.
 *
 * (scripts/tsconfig.eval.json maps `server-only` to Next's empty stub so the
 * server-only modules load in plain Node.)
 */

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, dailyPlans, weeklyPlans } from "@/db/schema";
import { normalizeLocale, type Locale } from "@fitmusc/shared/locale";
import { AI_MODELS } from "@/lib/ai";
import type { AIEffort } from "@/lib/ai-runtime";
import { categorizeWarnings, isSystemNote } from "@/lib/ai-warning-telemetry";
import { scoreMealValidationGaps, scoreExerciseValidationGaps } from "@/lib/ai-daily-validators";
import {
  resolveWeeklyGenerationRequest,
  buildWeeklyPrompts,
  runWeeklyGeneration,
  mergeWeeklyResults,
  scoreWeeklyValidationGaps,
} from "@/lib/ai-weekly-service";
import { prepareDailyMeals, executeDailyMeals } from "@/lib/ai-daily-meal-service";
import {
  prepareWorkoutReplacement,
  executeWorkoutReplacement,
} from "@/lib/ai-workout-service";

// ─── Fixed inputs — changing any of these invalidates comparisons ───────────

const EVAL_EMAIL = "temel.ekmen28@gmail.com";
/** Week after the account's latest plan, so the prior-week context is real. */
const WEEK_DATE = "2026-09-21";
type Flow = "weekly" | "daily-meal" | "workout";
interface Scenario { id: string; note?: string; dailyPlanId?: number }
const SCENARIOS: Record<Flow, Scenario[]> = {
  weekly: [
    { id: "plain" },
    { id: "no-lactose", note: "Bu hafta laktozlu ürün tüketmek istemiyorum." },
  ],
  "daily-meal": [
    { id: "workout-day", dailyPlanId: 277 },
    { id: "rest-day", dailyPlanId: 279 },
  ],
  workout: [
    { id: "workout-day", dailyPlanId: 277 },
    { id: "short-session", dailyPlanId: 276, note: "Bugün sadece 45 dakikam var." },
  ],
};

// ─── Cost accounting ─────────────────────────────────────────────────────────

const BUDGET_USD = 15;
/** Sonnet 5.5 $/MTok. usage.input_tokens excludes cache reads/writes, so pad. */
const RATES = { input: 2, output: 10 };
const COST_PADDING = 1.25;
/** Conservative per-item guesses used for the up-front budget check. */
const EST_ITEM_USD: Record<Flow, number> = { weekly: 0.7, "daily-meal": 0.1, workout: 0.08 };

const RESULTS_DIR = path.join(process.cwd(), "eval-results");
const SPEND_FILE = path.join(RESULTS_DIR, "spend.json");

interface SpendLog { totalUsd: number; runs: { label: string; usd: number; at: string }[] }

function readSpend(): SpendLog {
  if (!fs.existsSync(SPEND_FILE)) return { totalUsd: 0, runs: [] };
  return JSON.parse(fs.readFileSync(SPEND_FILE, "utf8")) as SpendLog;
}

function writeSpend(log: SpendLog) {
  fs.writeFileSync(SPEND_FILE, JSON.stringify(log, null, 2));
}

function costUsd(inputTokens: number, outputTokens: number): number {
  return ((inputTokens * RATES.input + outputTokens * RATES.output) / 1_000_000) * COST_PADDING;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

interface ItemResult {
  flow: Flow;
  scenario: string;
  rep: number;
  ok: boolean;
  error?: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  /** Validator gap score before any retry / after the full pipeline (lower = better). */
  initialScore: number | null;
  finalScore: number | null;
  /** Calls made (daily: exec.attempts; weekly: 2 legs + retries). */
  attempts: number;
  /** Mean |day total − target| / target over kcal/P/C/F (daily) or macroDriftScore (weekly). */
  macroError: number | null;
  warningCount: number;
  warningCategories: Record<string, number>;
  warnings: string[];
  /** Weekly only: final gap score per leg, so leg-specific changes separate. */
  legScores?: { nutrition: number | null; workout: number | null };
  /** A few rendered meals ("label: content (kcal)") to eyeball content quality. */
  sample?: string[];
}

type MealLike = { mealLabel?: unknown; content?: unknown; calories?: unknown };
const mealSample = (meals: readonly MealLike[] | undefined) =>
  (meals ?? []).map((m) => `${String(m.mealLabel)}: ${String(m.content)} (${String(m.calories)} kcal)`);

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

function dailyMacroError(
  meals: { calories: number | null; proteinG: string | null; carbsG: string | null; fatG: string | null }[],
  target: { calories?: number; protein?: number; carbs?: number; fat?: number } | undefined,
): number | null {
  if (!target) return null;
  const sum = meals.reduce(
    (a, m) => ({
      calories: a.calories + num(m.calories),
      protein: a.protein + num(m.proteinG),
      carbs: a.carbs + num(m.carbsG),
      fat: a.fat + num(m.fatG),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const keys = ["calories", "protein", "carbs", "fat"] as const;
  const errs: number[] = [];
  for (const k of keys) {
    const t = target[k];
    if (t != null && t > 0) errs.push(Math.abs(sum[k] - t) / t);
  }
  return errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null;
}

// ─── Runners ─────────────────────────────────────────────────────────────────

interface Ctx { userId: string; locale: Locale; effort?: AIEffort; dryRun: boolean }

async function runWeekly(ctx: Ctx, sc: Scenario): Promise<Omit<ItemResult, "flow" | "scenario" | "rep" | "ok">> {
  const req = await resolveWeeklyGenerationRequest(
    { dateStr: WEEK_DATE, userNote: sc.note, generateMode: "both", pastDows: [] },
    ctx.userId,
    ctx.locale,
  );
  const prompts = buildWeeklyPrompts(req);
  if (ctx.dryRun) {
    const chars = (prompts.nutrition?.userMessage.length ?? 0) + (prompts.workout?.userMessage.length ?? 0);
    return emptyMetrics(`dry-run: prompt chars=${chars}`);
  }
  const t0 = Date.now();
  const outcome = await runWeeklyGeneration(prompts, {
    locale: ctx.locale,
    muscleVolumeBands: req.muscleVolumeBands,
    previousWeekBreakdown: req.previousWeekBreakdown,
    isDeloadWeek: req.deloadWeek,
    effort: ctx.effort,
  });
  const durationMs = Date.now() - t0;
  const legs = [outcome.nutritionResult, outcome.workoutResult].filter((r) => r != null);
  // Each leg is scored against its own skip set (the workout leg also skips
  // every non-workout day), exactly as runAiCall scores it.
  const finalScore =
    (outcome.nutritionResult && prompts.nutrition
      ? scoreWeeklyValidationGaps(outcome.nutritionResult, prompts.nutrition.effectivePastDows)
      : 0) +
    (outcome.workoutResult && prompts.workout
      ? scoreWeeklyValidationGaps(outcome.workoutResult, prompts.workout.effectivePastDows)
      : 0);
  const legScores = {
    nutrition: outcome.nutritionResult && prompts.nutrition
      ? scoreWeeklyValidationGaps(outcome.nutritionResult, prompts.nutrition.effectivePastDows)
      : null,
    workout: outcome.workoutResult && prompts.workout
      ? scoreWeeklyValidationGaps(outcome.workoutResult, prompts.workout.effectivePastDows)
      : null,
  };
  const nutritionDays = (outcome.nutritionResult?.plan.days ?? []) as { meals?: MealLike[] }[];
  const sample = [0, 3].flatMap((d) => mealSample(nutritionDays[d]?.meals).map((m) => `day ${d} ${m}`));
  const first = outcome.firstAttemptGapScores;
  const initialScore = (first.nutrition ?? 0) + (first.workout ?? 0);
  mergeWeeklyResults(outcome, req); // mirrors the route; may append warnings
  const warnings = legs.flatMap((r) => r.warnings);
  const f = outcome.retryFlags;
  const retries = [f.nutritionTruncationRetry, f.nutritionQualityRetry, f.workoutTruncationRetry, f.workoutQualityRetry].filter(Boolean).length;
  return {
    durationMs,
    inputTokens: outcome.inputTokens,
    outputTokens: outcome.outputTokens,
    costUsd: costUsd(outcome.inputTokens, outcome.outputTokens),
    initialScore,
    finalScore,
    attempts: legs.length + retries,
    macroError: outcome.nutritionResult?.macroDriftScore ?? null,
    warningCount: warnings.length,
    warningCategories: categorizeWarnings(warnings),
    warnings,
    legScores,
    sample,
  };
}

async function runDailyMeal(ctx: Ctx, sc: Scenario): Promise<Omit<ItemResult, "flow" | "scenario" | "rep" | "ok">> {
  const prep = await prepareDailyMeals({ userId: ctx.userId, locale: ctx.locale, dailyPlanId: sc.dailyPlanId!, userNote: sc.note });
  if (ctx.dryRun) return emptyMetrics(`dry-run: prompt chars=${prep.userMessage.length}`);
  const t0 = Date.now();
  const out = await executeDailyMeals(prep, { effort: ctx.effort });
  const durationMs = Date.now() - t0;
  return {
    durationMs,
    inputTokens: out.exec.inputTokens,
    outputTokens: out.exec.outputTokens,
    costUsd: costUsd(out.exec.inputTokens, out.exec.outputTokens),
    initialScore: out.exec.initialScore ?? null,
    finalScore: scoreMealValidationGaps(out.exec.result),
    attempts: out.exec.attempts,
    macroError: dailyMacroError(out.suggestedMeals, prep.expectedTargets),
    warningCount: out.warnings.length,
    warningCategories: categorizeWarnings(out.warnings),
    warnings: out.warnings,
    sample: mealSample(out.suggestedMeals),
  };
}

async function runWorkout(ctx: Ctx, sc: Scenario): Promise<Omit<ItemResult, "flow" | "scenario" | "rep" | "ok">> {
  const prep = await prepareWorkoutReplacement({ userId: ctx.userId, locale: ctx.locale, dailyPlanId: sc.dailyPlanId!, userNote: sc.note });
  if (ctx.dryRun) return emptyMetrics(`dry-run: prompt chars=${prep.userMessage.length}`);
  const t0 = Date.now();
  const out = await executeWorkoutReplacement(prep, { effort: ctx.effort });
  const durationMs = Date.now() - t0;
  return {
    durationMs,
    inputTokens: out.exec.inputTokens,
    outputTokens: out.exec.outputTokens,
    costUsd: costUsd(out.exec.inputTokens, out.exec.outputTokens),
    initialScore: out.exec.initialScore ?? null,
    finalScore: scoreExerciseValidationGaps(out.exec.result),
    attempts: out.exec.attempts,
    macroError: null,
    warningCount: out.warnings.length,
    warningCategories: categorizeWarnings(out.warnings),
    warnings: out.warnings,
  };
}

function emptyMetrics(note: string): Omit<ItemResult, "flow" | "scenario" | "rep" | "ok"> {
  return {
    durationMs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, initialScore: null, finalScore: null,
    attempts: 0, macroError: null, warningCount: 0, warningCategories: {}, warnings: [note],
  };
}

const RUNNERS: Record<Flow, (ctx: Ctx, sc: Scenario) => ReturnType<typeof runWeekly>> = {
  weekly: runWeekly,
  "daily-meal": runDailyMeal,
  workout: runWorkout,
};

// ─── Summaries ───────────────────────────────────────────────────────────────

interface FlowSummary {
  n: number; ok: number;
  initialScore: number | null; finalScore: number | null; macroError: number | null;
  attempts: number | null; warnings: number | null;
  p50Ms: number | null; maxMs: number | null; costUsd: number;
  categories: Record<string, number>;
  /** Weekly: mean final gap score of each leg (runs recorded before legScores → null). */
  legNutrition: number | null; legWorkout: number | null;
}

const mean = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

function summarize(items: ItemResult[]): Record<string, FlowSummary> {
  const out: Record<string, FlowSummary> = {};
  for (const flow of Object.keys(SCENARIOS)) {
    const all = items.filter((i) => i.flow === flow);
    if (all.length === 0) continue;
    const ok = all.filter((i) => i.ok);
    const ms = ok.map((i) => i.durationMs).sort((a, b) => a - b);
    const categories: Record<string, number> = {};
    // Per ok run, so labels measured with different --reps compare directly.
    for (const i of ok) for (const [c, n] of Object.entries(i.warningCategories)) categories[c] = (categories[c] ?? 0) + n / ok.length;
    out[flow] = {
      n: all.length,
      ok: ok.length,
      initialScore: mean(ok.map((i) => i.initialScore)),
      finalScore: mean(ok.map((i) => i.finalScore)),
      macroError: mean(ok.map((i) => i.macroError)),
      attempts: mean(ok.map((i) => i.attempts)),
      // Problems only — system notes ([engine-scaled], [volume-adjusted]) excluded.
      warnings: mean(ok.map((i) => i.warnings.filter((w) => !isSystemNote(w)).length)),
      p50Ms: ms.length ? ms[Math.floor((ms.length - 1) / 2)] : null,
      maxMs: ms.length ? ms[ms.length - 1] : null,
      costUsd: all.reduce((s, i) => s + i.costUsd, 0),
      categories,
      legNutrition: mean(ok.map((i) => i.legScores?.nutrition ?? null)),
      legWorkout: mean(ok.map((i) => i.legScores?.workout ?? null)),
    };
  }
  return out;
}

const fmt = (v: number | null, d = 2) => (v == null ? "—" : v.toFixed(d));

function printSummary(label: string, s: Record<string, FlowSummary>) {
  console.log(`\n== ${label} ==`);
  console.table(
    Object.fromEntries(
      Object.entries(s).map(([flow, x]) => [
        flow,
        {
          ok: `${x.ok}/${x.n}`, initialScore: fmt(x.initialScore), finalScore: fmt(x.finalScore),
          macroError: fmt(x.macroError, 3), attempts: fmt(x.attempts, 1), warnings: fmt(x.warnings, 1),
          p50s: fmt(x.p50Ms == null ? null : x.p50Ms / 1000, 0), maxS: fmt(x.maxMs == null ? null : x.maxMs / 1000, 0),
          costUsd: x.costUsd.toFixed(2),
        },
      ]),
    ),
  );
  for (const [flow, x] of Object.entries(s)) {
    const top = Object.entries(x.categories).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (top.length) console.log(`  ${flow} categories / run:`, top.map(([c, n]) => `${c}=${n.toFixed(1)}`).join(", "));
    if (x.legNutrition != null || x.legWorkout != null) {
      console.log(`  ${flow} final gap per leg: nutrition=${fmt(x.legNutrition)} workout=${fmt(x.legWorkout)}`);
    }
  }
}

function latestResultFor(label: string): { items: ItemResult[] } {
  const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.startsWith(`${label}-`) && f.endsWith(".json")).sort();
  if (!files.length) throw new Error(`no results for label "${label}"`);
  return JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, files[files.length - 1]), "utf8"));
}

// ─── Main ────────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const compare = arg("compare");
  if (compare) {
    // Re-summarized from the raw items so older runs use the current metrics.
    for (const label of compare.split(",")) printSummary(label, summarize(latestResultFor(label).items));
    return;
  }

  const label = arg("label");
  if (!label || !/^[a-z0-9-]+$/i.test(label)) throw new Error("--label <name> is required ([a-z0-9-])");
  const reps = Math.max(1, Number(arg("reps") ?? 1));
  const effort = arg("effort") as AIEffort | undefined;
  const flows = (arg("flows")?.split(",") ?? Object.keys(SCENARIOS)) as Flow[];
  const dryRun = process.argv.includes("--dry-run");

  const [user] = await db
    .select({ id: users.id, locale: users.locale })
    .from(users)
    .where(eq(users.email, EVAL_EMAIL));
  if (!user) throw new Error(`eval account ${EVAL_EMAIL} not found`);

  // Guard: every hard-coded day must belong to the eval account.
  for (const sc of flows.flatMap((f) => SCENARIOS[f])) {
    if (sc.dailyPlanId == null) continue;
    const [row] = await db
      .select({ owner: weeklyPlans.userId })
      .from(dailyPlans)
      .innerJoin(weeklyPlans, eq(weeklyPlans.id, dailyPlans.weeklyPlanId))
      .where(eq(dailyPlans.id, sc.dailyPlanId));
    if (row?.owner !== user.id) throw new Error(`daily plan ${sc.dailyPlanId} is not owned by the eval account`);
  }

  const queue = flows.flatMap((flow) =>
    SCENARIOS[flow].flatMap((sc) => Array.from({ length: reps }, (_, r) => ({ flow, sc, rep: r + 1 }))),
  );
  const estimate = queue.reduce((s, q) => s + EST_ITEM_USD[q.flow], 0);
  const spend = readSpend();
  console.log(`[eval] ${label}: ${queue.length} item(s), model=${AI_MODELS.smart}, effort=${effort ?? "config"}${dryRun ? " (dry run)" : ""}`);
  console.log(`[eval] estimated cost ≈ $${estimate.toFixed(2)} — spent so far $${spend.totalUsd.toFixed(2)} of $${BUDGET_USD}`);
  if (!dryRun && spend.totalUsd + estimate > BUDGET_USD) {
    throw new Error(`refusing to run: would exceed the $${BUDGET_USD} eval budget`);
  }

  const ctx: Ctx = { userId: user.id, locale: normalizeLocale(user.locale), effort, dryRun };
  const items: ItemResult[] = [];
  let runUsd = 0;
  for (const { flow, sc, rep } of queue) {
    process.stdout.write(`[eval] ${flow}/${sc.id} #${rep} … `);
    try {
      const m = await RUNNERS[flow](ctx, sc);
      items.push({ flow, scenario: sc.id, rep, ok: true, ...m });
      console.log(dryRun ? m.warnings[0] : `ok ${(m.durationMs / 1000).toFixed(0)}s score ${m.initialScore}→${m.finalScore} $${m.costUsd.toFixed(3)}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      items.push({ flow, scenario: sc.id, rep, ok: false, error, ...emptyMetrics(error) });
      console.log(`FAILED: ${error.slice(0, 160)}`);
    }
    if (!dryRun) {
      const itemUsd = items[items.length - 1].costUsd;
      runUsd += itemUsd;
      spend.totalUsd += itemUsd;
      writeSpend(spend); // after every item, so an aborted run is still counted
    }
  }
  if (!dryRun) {
    spend.runs.push({ label, usd: runUsd, at: new Date().toISOString() });
    writeSpend(spend);
  }

  const summary = summarize(items);
  printSummary(label, summary);
  if (!dryRun) {
    const file = path.join(RESULTS_DIR, `${label}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify({ label, effort: effort ?? "config", weekDate: WEEK_DATE, items, summary }, null, 2));
    console.log(`\n[eval] wrote ${path.relative(process.cwd(), file)} — run cost $${runUsd.toFixed(2)}, total $${spend.totalUsd.toFixed(2)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
