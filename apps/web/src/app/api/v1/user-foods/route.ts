import type { IdDto, UserFoodDto } from "@fitmusc/shared/api/dto";
import { userFoodSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { createUserFood, listUserFoods } from "@/actions/user-foods";

export const GET = apiRoute({}, (): Promise<JsonSource<UserFoodDto[]>> => listUserFoods());

export const POST = apiRoute(
  { input: userFoodSchema },
  ({ input }): Promise<IdDto> => createUserFood(input),
);
