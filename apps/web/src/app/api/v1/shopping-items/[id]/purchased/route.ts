import { z } from "zod";
import { idParam, purchasedSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { toggleShoppingItem } from "@/actions/shopping";

export const PUT = apiRoute(
  { params: z.object({ id: idParam }), input: purchasedSchema },
  ({ params, input }) => toggleShoppingItem(params.id, input.isPurchased),
);
