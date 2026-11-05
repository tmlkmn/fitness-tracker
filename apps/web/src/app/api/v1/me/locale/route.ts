import type { LocaleResultDto } from "@fitmusc/shared/api/dto";
import { localeSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { updateUserLocale } from "@/actions/locale";

export const PUT = apiRoute(
  { input: localeSchema, errors: { InvalidLocale: [400, "INVALID_INPUT"] } },
  ({ input }): Promise<LocaleResultDto> => updateUserLocale(input.locale),
);
