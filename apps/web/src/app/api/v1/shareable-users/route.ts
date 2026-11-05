import type { ShareableUserDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getShareableUsers } from "@/actions/sharing";

export const GET = apiRoute({}, (): Promise<JsonSource<ShareableUserDto[]>> => getShareableUsers());
