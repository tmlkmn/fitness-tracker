import type { DailyGreetingDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getDailyGreeting } from "@/actions/ai-greeting";

/** Generated once per day and locale, then served from the cache. */
export const GET = apiRoute({}, (): Promise<JsonSource<DailyGreetingDto>> => getDailyGreeting());
