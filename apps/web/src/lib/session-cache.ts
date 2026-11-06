import { cookies } from "next/headers";

/**
 * Drops better-auth's cached session copy (and its chunks) so the next
 * getSession() — and the proxy's status gate — read the user row fresh from
 * the DB instead of the 5-minute cookie cache. Server actions only.
 */
export async function expireSessionCache(): Promise<void> {
  const cookieStore = await cookies();
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
}
