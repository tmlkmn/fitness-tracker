import type { NotificationPreferencesDto } from "@fitmusc/shared/api/dto";
import { notificationPreferencesSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/actions/notification-preferences";

export const GET = apiRoute(
  {},
  (): Promise<JsonSource<NotificationPreferencesDto>> => getNotificationPreferences(),
);

/** Only the fields sent are changed. */
export const PATCH = apiRoute(
  { input: notificationPreferencesSchema },
  ({ input }) => updateNotificationPreferences(input),
);
