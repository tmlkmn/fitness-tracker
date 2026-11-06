import { z } from "zod";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteSavedDailyMealSuggestion } from "@/actions/ai-meals";

export const DELETE = apiRoute(
  { params: z.object({ id: idParam }) },
  ({ params }) => deleteSavedDailyMealSuggestion(params.id),
);
