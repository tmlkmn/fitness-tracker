import type { CountDto } from "@fitmusc/shared/api/dto";
import { apiRoute } from "@/lib/api/handler";
import { getProgressLogCount } from "@/actions/progress";

export const GET = apiRoute(
  {},
  async (): Promise<CountDto> => ({ count: await getProgressLogCount() }),
);
