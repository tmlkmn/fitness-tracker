import { apiRoute } from "@/lib/api/handler";
import { markOnboardingSeen } from "@/actions/user";

export const POST = apiRoute({}, () => markOnboardingSeen());
