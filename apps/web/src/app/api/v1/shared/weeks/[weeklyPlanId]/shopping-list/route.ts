import { z } from "zod";
import type { ShoppingItemDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSharedShoppingList } from "@/actions/shared-plans";

export const GET = apiRoute(
  { params: z.object({ weeklyPlanId: idParam }) },
  ({ params }): Promise<JsonSource<ShoppingItemDto[]>> => getSharedShoppingList(params.weeklyPlanId),
);
