import { z } from "zod";
import { idParam, reminderEnabledSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { toggleReminder } from "@/actions/reminders";

export const PUT = apiRoute(
  {
    params: z.object({ id: idParam }),
    input: reminderEnabledSchema,
    errors: { "Hatırlatıcı bulunamadı": [404, "NOT_FOUND"] },
  },
  ({ params, input }) => toggleReminder(params.id, input.isEnabled),
);
