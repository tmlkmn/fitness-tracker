import { readinessLogSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { upsertReadinessLog } from "@/actions/readiness";

/** Upsert the day's check-in (logDate defaults to today, Turkey time). */
export const PUT = apiRoute(
  {
    input: readinessLogSchema,
    errors: {
      "Invalid energy rating": [400, "INVALID_INPUT"],
      "Invalid pain score": [400, "INVALID_INPUT"],
    },
  },
  async ({ input }) => {
    await upsertReadinessLog(input);
  },
);
