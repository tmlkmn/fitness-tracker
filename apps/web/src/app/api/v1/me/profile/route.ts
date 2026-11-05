import type { UserProfileDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getUserProfile } from "@/actions/user";

export const GET = apiRoute(
  {},
  (): Promise<JsonSource<UserProfileDto>> => getUserProfile(),
);
