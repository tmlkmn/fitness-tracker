import type { CountDto } from "@fitmusc/shared/api/dto";
import { apiRoute } from "@/lib/api/handler";
import { getUnreadCount } from "@/actions/notifications";

export const GET = apiRoute({}, (): Promise<CountDto> => getUnreadCount());
