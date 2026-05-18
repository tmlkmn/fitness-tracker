import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    console.warn("[push-subscribe] rejected: unauthenticated request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch {
    console.error("[push-subscribe] rejected: malformed JSON body", { userId });
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    console.error("[push-subscribe] rejected: incomplete subscription", {
      userId,
      hasEndpoint: Boolean(endpoint),
      hasP256dh: Boolean(keys?.p256dh),
      hasAuth: Boolean(keys?.auth),
    });
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Validate endpoint is a valid HTTPS URL. `host` (the push service, e.g.
  // fcm.googleapis.com / web.push.apple.com) is logged to confirm which
  // platform's push service the device handed us.
  let host = "";
  try {
    const url = new URL(endpoint);
    host = url.host;
    if (url.protocol !== "https:") {
      console.error("[push-subscribe] rejected: non-https endpoint", {
        userId,
        host,
      });
      return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    }
  } catch {
    console.error("[push-subscribe] rejected: malformed endpoint URL", {
      userId,
    });
    return NextResponse.json({ error: "Invalid endpoint URL" }, { status: 400 });
  }

  try {
    // Remove existing subscription with same endpoint (re-subscribe)
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );

    await db.insert(pushSubscriptions).values({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
  } catch (err) {
    console.error("[push-subscribe] failed: DB write error", {
      userId,
      host,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  console.log("[push-subscribe] subscription saved", { userId, host });
  return NextResponse.json({ success: true });
}
