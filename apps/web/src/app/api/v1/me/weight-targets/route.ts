import { weightTargetsSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { updateUserWeightTargets } from "@/actions/user";

// PUT, not PATCH: an omitted field is cleared.
export const PUT = apiRoute(
  { input: weightTargetsSchema },
  ({ input }) => updateUserWeightTargets(input),
);
