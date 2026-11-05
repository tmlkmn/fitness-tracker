import { supplementScheduleSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { updateSupplementSchedule } from "@/actions/user";

export const PUT = apiRoute(
  { input: supplementScheduleSchema },
  ({ input }) => updateSupplementSchedule(input.items),
);
