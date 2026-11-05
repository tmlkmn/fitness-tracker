import { macroStrategySchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { updateMacroStrategy } from "@/actions/user";

/** All-null resets to the goal's default strategy. */
export const PUT = apiRoute({ input: macroStrategySchema }, ({ input }) => updateMacroStrategy(input));
