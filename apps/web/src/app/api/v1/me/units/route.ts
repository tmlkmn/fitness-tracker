import { unitPreferencesSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { updateUnitPreferences } from "@/actions/user";

export const PUT = apiRoute(
  { input: unitPreferencesSchema },
  ({ input }) => updateUnitPreferences(input),
);
