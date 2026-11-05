"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthSession } from "@/lib/auth-utils";
import { isLocale, type Locale } from "@/lib/locale";

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

  // Expire better-auth's cached session copy (and any chunked parts) so the next
  // getSession() reads the fresh locale from the DB instead of the 5-minute
  // cookieCache. Otherwise the client session still reports the old locale and
  // LocaleSync bounces the URL straight back to the previous language.
  for (const c of cookieStore.getAll()) {
    if (
      c.name === "better-auth.session_data" ||
      c.name.startsWith("better-auth.session_data.") ||
      c.name === "__Secure-better-auth.session_data" ||
      c.name.startsWith("__Secure-better-auth.session_data.")
    ) {
      cookieStore.delete(c.name);
    }
  }

  return { success: true, locale };
}
