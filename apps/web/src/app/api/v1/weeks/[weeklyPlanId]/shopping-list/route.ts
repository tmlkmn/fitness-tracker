import { z } from "zod";
import type { ShoppingItemDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { generateShoppingList, getShoppingList } from "@/actions/shopping";

const params = z.object({ weeklyPlanId: idParam });

export const GET = apiRoute(
  { params },
  ({ params }): Promise<JsonSource<ShoppingItemDto[]>> => getShoppingList(params.weeklyPlanId),
);

/** Regenerates the list from the week's meals with AI (rate-limited). */
export const POST = apiRoute(
  {
    params,
    errors: {
      NO_MEALS: [422, "NO_MEALS"],
      AI_EMPTY_RESPONSE: [502, "AI_EMPTY_RESPONSE"],
    },
  },
  ({ params }) => generateShoppingList(params.weeklyPlanId),
);
