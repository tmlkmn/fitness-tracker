"use server";

import { db } from "@/db";
import { shoppingLists, dailyPlans, meals } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  verifyShoppingItemOwnership,
  verifyWeeklyPlanOwnership,
} from "@/lib/ownership";
import { getAIClient, AI_MODELS, checkRateLimit, logAiUsage } from "@/lib/ai";
import { SHOPPING_LIST_PROMPT } from "@/lib/ai-prompts";

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

export async function generateShoppingList(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);
  await checkRateLimit(user.id, "shopping");
  await logAiUsage(user.id, "shopping");

  // Fetch all meals for this week
  const weekMeals = await db
    .select({
      dayName: dailyPlans.dayName,
      mealLabel: meals.mealLabel,
      content: meals.content,
    })
    .from(meals)
    .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
    .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId))
    .orderBy(asc(dailyPlans.dayOfWeek), asc(meals.sortOrder));

  if (weekMeals.length === 0) {
    throw new Error("NO_MEALS");
  }

  // Build meal summary for AI
  const mealSummary = weekMeals
    .map((m) => `${m.dayName} - ${m.mealLabel}: ${m.content}`)
    .join("\n");

  try {
    const client = getAIClient();
    const message = await client.messages.create({
      model: AI_MODELS.fast,
      max_tokens: 1200,
      system: [
        {
          type: "text",
          text: SHOPPING_LIST_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `İşte bu haftanın beslenme programı:\n\n${mealSummary}\n\nBu öğünler için haftalık alışveriş listesi oluştur. JSON formatında yanıt ver.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON
    let cleaned = text
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

    const parsed = JSON.parse(cleaned) as {
      items: { category: string; itemName: string; quantity: string; notes: string | null }[];
    };

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error("AI_EMPTY_RESPONSE");
    }

    // Delete existing shopping list for this week
    await db
      .delete(shoppingLists)
      .where(eq(shoppingLists.weeklyPlanId, weeklyPlanId));

    // Insert new items
    const values = parsed.items.map((item, idx) => ({
      weeklyPlanId,
      category: item.category,
      itemName: item.itemName,
      quantity: item.quantity,
      notes: item.notes,
      sortOrder: idx,
    }));

    await db.insert(shoppingLists).values(values);
    revalidatePath("/alisveris");
  } catch (error) {
    if (error instanceof Error && (error.message === "RATE_LIMITED" || error.message.startsWith("COOLDOWN:"))) {
      throw error;
    }
    console.error("[AI] Error generating shopping list:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

export async function deleteShoppingList(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);
  await db
    .delete(shoppingLists)
    .where(eq(shoppingLists.weeklyPlanId, weeklyPlanId));
  revalidatePath("/alisveris");
}
