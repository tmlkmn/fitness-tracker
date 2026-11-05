import type { ProgressLogDto } from "@fitmusc/shared/api/dto";
import { progressLogSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { addProgressLog, getProgressLogs } from "@/actions/progress";

export const GET = apiRoute({}, (): Promise<JsonSource<ProgressLogDto[]>> => getProgressLogs());

export const POST = apiRoute({ input: progressLogSchema }, ({ input }) => addProgressLog(input));
