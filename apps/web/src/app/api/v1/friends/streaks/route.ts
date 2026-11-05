import type { FriendStreakDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getFriendStreaks } from "@/actions/friend-stats";

export const GET = apiRoute({}, (): Promise<JsonSource<FriendStreakDto[]>> => getFriendStreaks());
