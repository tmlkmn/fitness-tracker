import { apiRoute } from "@/lib/api/handler";
import { markAllAsRead } from "@/actions/notifications";

export const POST = apiRoute({}, () => markAllAsRead());
