import { z } from "zod";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteSavedMealSuggestion } from "@/actions/saved-meals";

export const DELETE = apiRoute(
  { params: z.object({ id: idParam }) },
  ({ params }) => deleteSavedMealSuggestion(params.id),
);
