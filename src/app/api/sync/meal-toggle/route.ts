import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/db";
import { meals } from "@/db/schema";
import { verifyMealOwnership } from "@/lib/ownership";
import { isMealTogglePayload } from "@/lib/sync-payloads";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isMealTogglePayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await verifyMealOwnership(body.id, user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(meals)
    .set({ isCompleted: body.isCompleted })
    .where(eq(meals.id, body.id));
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
