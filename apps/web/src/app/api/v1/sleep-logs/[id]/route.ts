import { z } from "zod";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteSleepLog } from "@/actions/sleep";

export const DELETE = apiRoute(
  { params: z.object({ id: idParam }) },
  ({ params }) => deleteSleepLog(params.id),
);
