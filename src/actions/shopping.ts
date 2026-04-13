"use server";

import { db } from "@/db";
import { shoppingLists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleShoppingItem(id: number, isPurchased: boolean) {
  await db.update(shoppingLists).set({ isPurchased }).where(eq(shoppingLists.id, id));
  revalidatePath("/alisveris");
}

export async function getShoppingList(weeklyPlanId: number) {
  return db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.weeklyPlanId, weeklyPlanId))
    .orderBy(shoppingLists.sortOrder);
}
