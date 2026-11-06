import { getUserLocale } from "@fitmusc/shared/locale";
import { ApiError, apiRoute } from "@/lib/api/handler";
import { checkRateLimit } from "@/lib/ai";
import { streamProgressAnalysis } from "@/lib/ai-progress-analysis";

export const maxDuration = 60;

/** Streams a markdown analysis of the latest progress logs as text/plain. */
export const POST = apiRoute({}, async ({ user }) => {
  await checkRateLimit(user.id, "analyze");
  const analysis = await streamProgressAnalysis(user.id, getUserLocale(user));
  if (!analysis) throw new ApiError(422, "NOT_ENOUGH_DATA");
  return analysis;
});
