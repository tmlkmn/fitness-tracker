import { z } from "zod";
import type { AiJobDto } from "@fitmusc/shared/api/dto";
import { apiRoute, orNotFound, type JsonSource } from "@/lib/api/handler";
import { getAiJob } from "@/lib/ai-jobs";

export const GET = apiRoute(
  { params: z.object({ jobId: z.uuid() }) },
  async ({ params, user }): Promise<JsonSource<AiJobDto>> =>
    orNotFound(await getAiJob(user.id, params.jobId)),
);
