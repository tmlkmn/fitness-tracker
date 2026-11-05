import { apiRoute } from "@/lib/api/handler";
import { getUserProfile } from "@/actions/user";

export const GET = apiRoute({}, () => getUserProfile());
