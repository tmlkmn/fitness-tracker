import { z } from "zod";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { revokeShare } from "@/actions/sharing";

export const DELETE = apiRoute(
  {
    params: z.object({ shareId: idParam }),
    errors: { "Paylaşım bulunamadı": [404, "NOT_FOUND"] },
  },
  ({ params }) => revokeShare(params.shareId),
);
