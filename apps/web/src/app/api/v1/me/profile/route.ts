import type { UserProfileDto } from "@fitmusc/shared/api/dto";
import { profileUpdateSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getUserProfile, updateUserProfile } from "@/actions/user";

export const GET = apiRoute(
  {},
  (): Promise<JsonSource<UserProfileDto>> => getUserProfile(),
);

/** Only the fields sent are changed. */
export const PATCH = apiRoute({ input: profileUpdateSchema }, ({ input }) => updateUserProfile(input));
