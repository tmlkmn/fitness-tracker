"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthSession } from "@/lib/auth-utils";
import { expireSessionCache } from "@/lib/session-cache";
import { isLocale, type Locale } from "@fitmusc/shared/locale";

export async function updateUserLocale(locale: Locale) {
  if (!isLocale(locale)) {
    throw new Error("InvalidLocale");
  }
  const user = await getAuthSession();

  await db.update(users).set({ locale }).where(eq(users.id, user.id));

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Otherwise the client session still reports the old locale for up to 5
  // minutes and LocaleSync bounces the URL straight back to the previous language.
  await expireSessionCache();

  return { success: true, locale };
}
