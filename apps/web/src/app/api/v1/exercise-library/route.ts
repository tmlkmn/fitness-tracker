import type { ExerciseLibraryEntryDto } from "@fitmusc/shared/api/dto";
import { searchTextQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { searchExercises } from "@/actions/exercise-library";

export const GET = apiRoute(
  { input: searchTextQuery },
  ({ input }): Promise<JsonSource<ExerciseLibraryEntryDto[]>> => searchExercises(input.q),
);
