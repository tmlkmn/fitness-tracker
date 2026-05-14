import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { verifyExerciseOwnership } from "@/lib/ownership";
import { isExerciseTogglePayload } from "@/lib/sync-payloads";

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

  if (!isExerciseTogglePayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await verifyExerciseOwnership(body.id, session.user.id);
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
