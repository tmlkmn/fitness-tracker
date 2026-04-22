"use server";

import { db } from "@/db";
import { userFoods } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";

export interface UserFoodInput {
  name: string;
  portion: string;
  calories: number;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
  category?: string | null;
}

export async function listUserFoods() {
  const user = await getAuthUser();
  return db
    .select()
    .from(userFoods)
    .where(eq(userFoods.userId, user.id))
    .orderBy(desc(userFoods.createdAt));
}

export async function createUserFood(data: UserFoodInput) {
  const user = await getAuthUser();
  const name = data.name.trim();
  const portion = data.portion.trim();
  if (!name || !portion) throw new Error("INVALID_INPUT");

  const [created] = await db
    .insert(userFoods)
    .values({
      userId: user.id,
      name,
      portion,
      calories: data.calories,
      proteinG: data.proteinG ?? null,
      carbsG: data.carbsG ?? null,
      fatG: data.fatG ?? null,
      category: data.category ?? null,
    })
    .returning({ id: userFoods.id });

  revalidatePath("/");
  return created;
}

export async function deleteUserFood(id: number) {
  const user = await getAuthUser();
  await db
    .delete(userFoods)
    .where(and(eq(userFoods.id, id), eq(userFoods.userId, user.id)));
  revalidatePath("/");
}
