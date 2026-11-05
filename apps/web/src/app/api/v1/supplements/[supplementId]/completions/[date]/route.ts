import { z } from "zod";
import { dateString, idParam, supplementCompletionSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { toggleSupplementCompletion } from "@/actions/supplement-completion";

export const PUT = apiRoute(
  {
    params: z.object({ supplementId: idParam, date: dateString }),
    input: supplementCompletionSchema,
  },
  ({ params, input }) => toggleSupplementCompletion(params.supplementId, params.date, input.completed),
);
