"use server";

import { db } from "@/db";
import { cookieConsents } from "@/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function saveCookieConsent(consent: {
  necessary: boolean;
  analytics: boolean;
}) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = hdrs.get("user-agent") ?? null;

  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: hdrs });
    userId = session?.user?.id ?? null;
  } catch {
    // Not authenticated — anonymous consent
  }

  await db.insert(cookieConsents).values({
    userId,
    sessionId: null,
    necessary: consent.necessary,
    analytics: consent.analytics,
    ipAddress: ip,
    userAgent: ua,
  });

  return { success: true };
}
