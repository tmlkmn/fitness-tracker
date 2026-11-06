import type { AiMacroResultDto } from "@fitmusc/shared/api/dto";
import { aiMacroTargetsSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { generateAIMacroTargets } from "@/actions/ai-macro";

/** Suggests a macro strategy — nothing is saved until PUT /me/macro-strategy. */
export const POST = apiRoute(
  { input: aiMacroTargetsSchema },
  ({ input }): Promise<JsonSource<AiMacroResultDto>> => generateAIMacroTargets(input.description),
);
