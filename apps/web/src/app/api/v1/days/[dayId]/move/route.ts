import { z } from "zod";
import type { MoveDayContentsResultDto } from "@fitmusc/shared/api/dto";
import { idParam, moveDayContentsSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { moveDayContents } from "@/actions/day-content-move";

/** Move / swap / replace this day's workout and/or meals onto another day of the same week. */
export const POST = apiRoute(
  {
    params: z.object({ dayId: idParam }),
    input: moveDayContentsSchema,
    errors: {
      "Kaynak ve hedef gün aynı olamaz": [400, "SAME_DAY"],
      "En az antrenman ya da beslenme seçilmeli": [400, "NOTHING_SELECTED"],
      "Gün bulunamadı": [404, "NOT_FOUND"],
      "Sadece aynı hafta içinde taşıma yapılabilir": [400, "DIFFERENT_WEEK"],
    },
  },
  ({ params, input }): Promise<JsonSource<MoveDayContentsResultDto>> =>
    moveDayContents({ sourceDailyPlanId: params.dayId, ...input }),
);
