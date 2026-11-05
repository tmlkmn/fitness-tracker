import { z } from "zod";
import { idParam, reminderUpdateSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteReminder, updateReminder } from "@/actions/reminders";

const params = z.object({ id: idParam });
const errors = { "Hatırlatıcı bulunamadı": [404, "NOT_FOUND"] } as const;

/** Only the fields sent are changed. */
export const PATCH = apiRoute(
  { params, input: reminderUpdateSchema, errors },
  ({ params, input }) => updateReminder(params.id, input),
);

export const DELETE = apiRoute({ params, errors }, ({ params }) => deleteReminder(params.id));
