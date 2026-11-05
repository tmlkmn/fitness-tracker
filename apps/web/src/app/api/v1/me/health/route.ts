import { healthProfileSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { updateHealthProfile } from "@/actions/user";

export const PUT = apiRoute(
  {
    input: healthProfileSchema,
    errors: {
      "Invalid gender value": [400, "INVALID_INPUT"],
      "Invalid dailyActivityLevel value": [400, "INVALID_INPUT"],
    },
  },
  ({ input }) => updateHealthProfile(input),
);
