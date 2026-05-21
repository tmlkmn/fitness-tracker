import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { verifyExerciseOwnership } from "@/lib/ownership";
import { isExerciseTogglePayload } from "@/lib/sync-payloads";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isExerciseTogglePayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await verifyExerciseOwnership(body.id, user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(exercises)
    .set({ isCompleted: body.isCompleted })
    .where(eq(exercises.id, body.id));
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
