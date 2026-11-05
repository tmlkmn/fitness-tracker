import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { clearOutbox } from "@/lib/outbox";
import { clearQueryCache } from "@/lib/query-persister";

export const authClient = createAuthClient({
  // In the browser always hit the page's own origin. NEXT_PUBLIC_APP_URL is
  // the production URL in every Vercel environment, so pinning to it made
  // preview deployments POST cross-origin to production (CORS-blocked).
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  plugins: [adminClient()],
});

export const { useSession, signIn } = authClient;

// Wrap signOut so per-user IndexedDB state (outbox + persisted query cache)
// is wiped on logout. Otherwise the next user on the same device would see
// stale cache hits, and a half-drained outbox could replay as the wrong user.
export async function signOut(
  ...args: Parameters<typeof authClient.signOut>
): Promise<ReturnType<typeof authClient.signOut>> {
  try {
    await Promise.all([clearOutbox(), clearQueryCache()]);
  } catch {
    // best-effort; sign out anyway
  }
  return authClient.signOut(...args);
}
