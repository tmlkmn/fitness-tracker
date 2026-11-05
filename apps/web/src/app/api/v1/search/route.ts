import type { SearchResultsDto } from "@fitmusc/shared/api/dto";
import { searchTextQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { globalSearch } from "@/actions/search";

export const GET = apiRoute(
  { input: searchTextQuery },
  ({ input }): Promise<JsonSource<SearchResultsDto>> => globalSearch(input.q),
);
