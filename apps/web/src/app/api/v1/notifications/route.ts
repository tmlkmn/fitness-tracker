import type { NotificationDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { clearAllNotifications, getNotifications } from "@/actions/notifications";

export const GET = apiRoute({}, (): Promise<JsonSource<NotificationDto[]>> => getNotifications());

export const DELETE = apiRoute({}, () => clearAllNotifications());
