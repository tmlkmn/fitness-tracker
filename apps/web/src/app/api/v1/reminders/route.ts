import type { ReminderDto } from "@fitmusc/shared/api/dto";
import { reminderCreateSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { createReminder, getReminders } from "@/actions/reminders";

export const GET = apiRoute({}, (): Promise<JsonSource<ReminderDto[]>> => getReminders());

export const POST = apiRoute({ input: reminderCreateSchema }, ({ input }) => createReminder(input));
