import type { MacroTargetsDto } from "@fitmusc/shared/api/dto";
import { apiRoute } from "@/lib/api/handler";
import { getResolvedMacroTargets } from "@/actions/user";

/** null until the profile has enough data (weight, height, …) to compute targets. */
export const GET = apiRoute(
  {},
  (): Promise<MacroTargetsDto | null> => getResolvedMacroTargets(),
);
