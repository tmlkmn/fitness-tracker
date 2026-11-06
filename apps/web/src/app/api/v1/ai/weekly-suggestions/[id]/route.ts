import { z } from "zod";
import type { SavedWeeklySuggestionDetailDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { deleteSavedSuggestion, getSavedSuggestionById } from "@/actions/ai-suggestions";

const params = z.object({ id: idParam });

export const GET = apiRoute(
  { params },
  ({ params }): Promise<JsonSource<SavedWeeklySuggestionDetailDto>> =>
    getSavedSuggestionById(params.id),
);

export const DELETE = apiRoute({ params }, ({ params }) => deleteSavedSuggestion(params.id));
