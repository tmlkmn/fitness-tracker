import type { AiJobDto, AiJobSummaryDto } from "@fitmusc/shared/api/dto";
import { aiJobCreateSchema, aiJobsQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { listAiJobs, startAiJob } from "@/lib/ai-jobs";

// The generation runs in after() and shares this budget — weekly plans take up
// to ~13 minutes (see src/app/api/ai/weekly/route.ts).
export const maxDuration = 800;

/** Starts a daily-meals / workout / weekly generation; 202 + the queued job. */
export const POST = apiRoute(
  { input: aiJobCreateSchema, status: 202 },
  ({ input, user }): Promise<JsonSource<AiJobDto>> => startAiJob(user, input),
);

export const GET = apiRoute(
  { input: aiJobsQuery },
  ({ input, user }): Promise<JsonSource<AiJobSummaryDto>[]> => listAiJobs(user.id, input.limit),
);
