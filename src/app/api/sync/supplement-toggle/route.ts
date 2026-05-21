import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/db";
import { supplementCompletions, supplements, weeklyPlans } from "@/db/schema";
import { isSupplementTogglePayload } from "@/lib/sync-payloads";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isSupplementTogglePayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rows = await db
    .select({ id: supplements.id })
    .from(supplements)
    .innerJoin(weeklyPlans, eq(supplements.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(supplements.id, body.supplementId),
        eq(weeklyPlans.userId, user.id),
      ),
    );
  if (rows.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.completed) {
    await db
      .insert(supplementCompletions)
      .values({
        supplementId: body.supplementId,
        userId: user.id,
        completionDate: body.date,
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(supplementCompletions)
      .where(
        and(
          eq(supplementCompletions.supplementId, body.supplementId),
          eq(supplementCompletions.userId, user.id),
          eq(supplementCompletions.completionDate, body.date),
        ),
      );
  }

  revalidatePath("/gun");

  return NextResponse.json({ ok: true });
}
