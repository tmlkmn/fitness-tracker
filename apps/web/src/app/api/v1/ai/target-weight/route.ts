import type { TargetWeightSuggestionDto } from "@fitmusc/shared/api/dto";
import { getUserLocale } from "@fitmusc/shared/locale";
import { apiRoute } from "@/lib/api/handler";
import { checkRateLimit } from "@/lib/ai";
import { suggestTargetWeight } from "@/lib/ai-target-weight";

export const maxDuration = 30;

/** Suggestion only — save it with PUT /me/weight-targets. */
export const POST = apiRoute(
  {
    errors: {
      NOT_ENOUGH_DATA: [422, "NOT_ENOUGH_DATA"],
      AI_EMPTY_RESPONSE: [502, "AI_EMPTY_RESPONSE"],
    },
  },
  async ({ user }): Promise<TargetWeightSuggestionDto> => {
    await checkRateLimit(user.id, "target-weight");
    return suggestTargetWeight(user.id, getUserLocale(user));
  },
);
