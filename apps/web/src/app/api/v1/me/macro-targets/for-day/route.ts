import type { MacroTargetsForDayDto } from "@fitmusc/shared/api/dto";
import { macroTargetsForDayQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getResolvedMacroTargetsForDay } from "@/actions/user";

/** Targets with carb cycling applied for ?planType=. */
export const GET = apiRoute(
  { input: macroTargetsForDayQuery },
  ({ input }): Promise<JsonSource<MacroTargetsForDayDto>> =>
    getResolvedMacroTargetsForDay(input.planType ?? null),
);
