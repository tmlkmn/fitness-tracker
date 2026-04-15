"use server";

import { db } from "@/db";
import { shoppingLists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  verifyShoppingItemOwnership,
  verifyWeeklyPlanOwnership,
} from "@/lib/ownership";

export async function toggleShoppingItem(id: number, isPurchased: boolean) {
  const user = await getAuthUser();
  await verifyShoppingItemOwnership(id, user.id);
  await db
    .update(shoppingLists)
    .set({ isPurchased })
    .where(eq(shoppingLists.id, id));
  revalidatePath("/alisveris");
}

export async function getShoppingList(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);
  return db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.weeklyPlanId, weeklyPlanId))
    .orderBy(shoppingLists.sortOrder);
}
