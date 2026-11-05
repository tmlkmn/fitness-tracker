import { z } from "zod";
import { idParam, progressLogSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteProgressLog, updateProgressLog } from "@/actions/progress";

const params = z.object({ id: idParam });

// PATCH: logDate is required, but omitted measurements are left unchanged
// (updateProgressLog skips undefined keys) — there's no way to clear one.
export const PATCH = apiRoute(
  { params, input: progressLogSchema },
  ({ params, input }) => updateProgressLog(params.id, input),
);

export const DELETE = apiRoute({ params }, ({ params }) => deleteProgressLog(params.id));
