import type { IdDto } from "@fitmusc/shared/api/dto";
import { feedbackSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { submitFeedback } from "@/actions/feedback";

export const POST = apiRoute(
  { input: feedbackSchema },
  ({ input }): Promise<IdDto> => submitFeedback(input),
);
