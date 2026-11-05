import { onboardingSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { updateUserOnboarding } from "@/actions/user";

export const POST = apiRoute({ input: onboardingSchema }, ({ input }) => updateUserOnboarding(input));
