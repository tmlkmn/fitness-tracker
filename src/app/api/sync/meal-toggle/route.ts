import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { meals } from "@/db/schema";
import { verifyMealOwnership } from "@/lib/ownership";
import { isMealTogglePayload } from "@/lib/sync-payloads";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    await verifyMealOwnership(body.id, session.user.id);
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
