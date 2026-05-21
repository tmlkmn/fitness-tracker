import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  // Unsubscribe must always succeed for any authenticated user, regardless of
  // approval / billing state — they need a way out.
  const { user, response } = await requireApiUser({
    requireApproved: false,
    requireActiveBilling: false,
  });
  if (response) return response;

  const body = await request.json();
  const { endpoint } = body;

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );

  return NextResponse.json({ success: true });
}
