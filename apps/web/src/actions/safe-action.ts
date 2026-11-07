"use server";

import { unstable_rethrow } from "next/navigation";
import { deleteMyAccount } from "@/actions/account";
import { getAiUsageByFeature, getAiUsageByUser, getAiWarningsAnalytics, inviteUser, listAllUsers } from "@/actions/admin";
import { getAdminAiCostSummary } from "@/actions/admin-operations";
import { generateMealVariation, getExerciseFormTips } from "@/actions/ai";
import { generateAIMacroTargets } from "@/actions/ai-macro";
import { generateDailyMeals } from "@/actions/ai-meals";
import { generateExerciseVariation, generateSectionReplacement, generateWorkoutReplacement } from "@/actions/ai-workout";
import { signUpWithTrial } from "@/actions/auth";
import { moveDayContents } from "@/actions/day-content-move";
import { getExerciseDemo } from "@/actions/exercise-demo";
import { listAllFeedbacks } from "@/actions/feedback";
import { generateShoppingList } from "@/actions/shopping";
import { expectedErrorCode } from "@/lib/action-errors";

/**
 * Server actions whose failures the web UI tells apart (quota reached,
 * e-mail mismatch, …). The browser calls them through `callAction`
 * (src/lib/safe-action.ts) so the error code survives production, where
 * React strips thrown messages. Each action still checks its own auth and
 * input — this only changes how an expected error travels back. API routes
 * keep calling the actions directly.
 */
const SAFE_ACTIONS = {
  deleteMyAccount,
  generateMealVariation,
  getExerciseFormTips,
  generateAIMacroTargets,
  generateDailyMeals,
  generateWorkoutReplacement,
  generateSectionReplacement,
  generateExerciseVariation,
  getExerciseDemo,
  generateShoppingList,
  moveDayContents,
  signUpWithTrial,
  inviteUser,
  listAllUsers,
  listAllFeedbacks,
  getAiUsageByFeature,
  getAiUsageByUser,
  getAiWarningsAnalytics,
  getAdminAiCostSummary,
};

export type SafeActions = typeof SAFE_ACTIONS;

export type SafeActionResult = { ok: true; data: unknown } | { ok: false; error: string };

export async function runSafeAction(name: keyof SafeActions, args: unknown[]): Promise<SafeActionResult> {
  if (!Object.hasOwn(SAFE_ACTIONS, name) || !Array.isArray(args)) {
    return { ok: false, error: "UNKNOWN_ACTION" };
  }
  const action = SAFE_ACTIONS[name] as (...input: unknown[]) => Promise<unknown>;
  try {
    return { ok: true, data: await action(...args) };
  } catch (err) {
    // redirect() / notFound() and other Next.js control flow must propagate.
    unstable_rethrow(err);
    const code = expectedErrorCode(err);
    if (code) return { ok: false, error: code };
    throw err;
  }
}
