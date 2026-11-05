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

/** Share this week read-only with another approved user (notifies them). */
export const POST = apiRoute(
  {
    params,
    input: shareSchema,
    errors: {
      "Kendi planınızı kendinizle paylaşamazsınız": [400, "CANNOT_SHARE_WITH_SELF"],
      "Geçmiş haftalar paylaşılamaz": [400, "PAST_WEEK"],
      "Bu plan zaten bu kullanıcıyla paylaşılmış": [409, "ALREADY_SHARED"],
    },
  },
  ({ params, input }) => shareWeeklyPlan(params.weeklyPlanId, input.sharedWithUserId),
);
