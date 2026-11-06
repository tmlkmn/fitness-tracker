import type { AiQuotaDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getAiQuotas } from "@/actions/ai-quota";

export const GET = apiRoute({}, (): Promise<JsonSource<AiQuotaDto>> => getAiQuotas());
