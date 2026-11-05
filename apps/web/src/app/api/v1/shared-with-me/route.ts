import type { SharedWithMeDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getPlansSharedWithMe } from "@/actions/sharing";

export const GET = apiRoute({}, (): Promise<JsonSource<SharedWithMeDto[]>> => getPlansSharedWithMe());
