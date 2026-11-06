import type { SectionReplacementResultDto } from "@fitmusc/shared/api/dto";
import { aiWorkoutSectionSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { generateSectionReplacement } from "@/actions/ai-workout";

// Smart model: initial call + parse-fail retry + quality retry (45s each).
export const maxDuration = 300;

export const POST = apiRoute(
  { input: aiWorkoutSectionSchema },
  ({ input }): Promise<JsonSource<SectionReplacementResultDto>> =>
    generateSectionReplacement(input.dailyPlanId, input.section, input.sectionLabel, input.userNote),
);
