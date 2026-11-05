import type { MacroTargetsDto } from "@fitmusc/shared/api/dto";
import { apiRoute } from "@/lib/api/handler";
import { getDefaultMacroTargets } from "@/actions/user";

/** Goal-default targets, ignoring the user's strategy nudge. */
export const GET = apiRoute(
  {},
  (): Promise<MacroTargetsDto | null> => getDefaultMacroTargets(),
);
