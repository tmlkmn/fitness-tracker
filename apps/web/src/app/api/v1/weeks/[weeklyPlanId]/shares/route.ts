import { z } from "zod";
import type { PlanShareDto } from "@fitmusc/shared/api/dto";
import { idParam, shareSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getMySharesForPlan, shareWeeklyPlan } from "@/actions/sharing";

const params = z.object({ weeklyPlanId: idParam });

export const GET = apiRoute(
  { params },
  ({ params }): Promise<JsonSource<PlanShareDto[]>> => getMySharesForPlan(params.weeklyPlanId),
);

/**
 * Share this week read-only (notifies the recipient). The recipient comes by
 * `email` — users are never listed — or by `sharedWithUserId` for someone
 * from GET /shareable-users (people shared with before). E-mail lookups are
 * rate limited (429).
 */
export const POST = apiRoute(
  {
    params,
    input: shareSchema,
    errors: {
      CANNOT_SHARE_WITH_SELF: [400, "CANNOT_SHARE_WITH_SELF"],
      PAST_WEEK: [400, "PAST_WEEK"],
      ALREADY_SHARED: [409, "ALREADY_SHARED"],
      RECIPIENT_NOT_FOUND: [404, "RECIPIENT_NOT_FOUND"],
    },
  },
  async ({ params, input }) => {
    const target = input.email !== undefined ? { email: input.email } : { userId: input.sharedWithUserId ?? "" };
    const result = await shareWeeklyPlan(params.weeklyPlanId, target);
    if (!result.ok) {
      // Back into the handler's error mapping (RATE_LIMITED:n → 429 + Retry-After).
      throw new Error(result.error === "RATE_LIMITED" ? `RATE_LIMITED:${result.retryAfter ?? 60}` : result.error);
    }
  },
);
