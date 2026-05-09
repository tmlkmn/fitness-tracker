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

  return { success: true, locale };
}
