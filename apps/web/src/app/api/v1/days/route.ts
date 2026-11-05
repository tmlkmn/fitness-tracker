import type { IdDto } from "@fitmusc/shared/api/dto";
import { ensureDaySchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { ensureDailyPlan } from "@/actions/ensure-plan";

/** Idempotent: returns the day for "date", creating its week/day rows if missing. */
export const POST = apiRoute(
  { input: ensureDaySchema },
  async ({ input }): Promise<IdDto> => ({ id: await ensureDailyPlan(input.date) }),
);
