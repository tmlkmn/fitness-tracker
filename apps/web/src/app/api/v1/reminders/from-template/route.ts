import { reminderFromTemplateSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { createReminderFromTemplate } from "@/actions/reminders";

export const POST = apiRoute(
  {
    input: reminderFromTemplateSchema,
    errors: { "Şablon bulunamadı": [400, "INVALID_INPUT"] },
  },
  ({ input }) => createReminderFromTemplate(input.templateKey),
);
