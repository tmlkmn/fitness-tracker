import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { expoPushTickets, expoPushTokens } from "@/db/schema";
import { redactId } from "@/lib/log-redact";

/**
 * Push channel for the Expo mobile app (web push lives in `web-push.ts`).
 *
 * Delivery is two-step on Expo's side: the send call returns a *ticket* per
 * message, and the delivery *receipt* (where APNs / FCM report a dead device)
 * is only readable ~15 min later. Tickets are stored in `expo_push_tickets`
 * and `checkExpoPushReceipts()` — run by the reminders cron — prunes tokens
 * whose receipt says DeviceNotRegistered.
 */

const SEND_URL = "https://exp.host/--/api/v2/push/send";
const RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
// Expo's per-request limits.
const SEND_CHUNK = 100;
const RECEIPT_CHUNK = 1000;
// Receipts become available ~15 min after sending and expire after ~24 h.
const RECEIPT_READY_MS = 15 * 60_000;
const RECEIPT_EXPIRY_MS = 24 * 3600_000;

type ExpoResult =
  | { status: "ok"; id?: string }
  | { status: "error"; message: string; details?: { error?: string } };

export type ExpoPlatform = "ios" | "android";

function expoHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };
  // Only needed when "Enhanced push security" is enabled for the Expo project.
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }
  return headers;
}

async function postExpo<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, { method: "POST", headers: expoHeaders(), body: JSON.stringify(body) });
    if (!res.ok) {
      console.error(`[expo-push] ${url} failed: HTTP ${res.status}`, (await res.text()).slice(0, 300));
      return null;
    }
    return ((await res.json()) as { data: T }).data;
  } catch (err) {
    console.error(`[expo-push] ${url} failed:`, err);
    return null;
  }
}

async function deleteTokens(tokens: string[], source: "ticket" | "receipt"): Promise<void> {
  if (tokens.length === 0) return;
  await db.delete(expoPushTokens).where(inArray(expoPushTokens.token, tokens));
  console.warn(
    `[expo-push] removed ${tokens.length} unregistered token(s) from ${source}: ${tokens.map((t) => redactId(t)).join(", ")}`,
  );
}

/** Registers (or moves to this user) a device token. */
export async function registerExpoPushToken(
  userId: string,
  token: string,
  platform: ExpoPlatform,
): Promise<void> {
  await db
    .insert(expoPushTokens)
    .values({ userId, token, platform })
    .onConflictDoUpdate({
      target: expoPushTokens.token,
      set: { userId, platform, updatedAt: new Date() },
    });
  console.log(`[expo-push] token registered user=${redactId(userId)} platform=${platform}`);
}

/** Removes the device token — only if it belongs to this user. */
export async function unregisterExpoPushToken(userId: string, token: string): Promise<void> {
  await db
    .delete(expoPushTokens)
    .where(and(eq(expoPushTokens.userId, userId), eq(expoPushTokens.token, token)));
}

export async function getExpoPushTokens(userId: string): Promise<string[]> {
  const rows = await db
    .select({ token: expoPushTokens.token })
    .from(expoPushTokens)
    .where(eq(expoPushTokens.userId, userId));
  return rows.map((r) => r.token);
}

/**
 * Sends one notification to every token. Never throws — a failed push must not
 * fail the action that triggered it. `url` is the web path of the target page;
 * the app maps it (and `tag`, the notification type) to a screen.
 */
export async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<void> {
  for (let i = 0; i < tokens.length; i += SEND_CHUNK) {
    const chunk = tokens.slice(i, i + SEND_CHUNK);
    const tickets = await postExpo<ExpoResult[]>(
      SEND_URL,
      chunk.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        sound: "default",
        data: { url: payload.url ?? null, tag: payload.tag ?? null },
      })),
    );
    if (!tickets) continue;

    const accepted: { id: string; token: string }[] = [];
    const dead: string[] = [];
    tickets.forEach((ticket, j) => {
      if (ticket.status === "ok" && ticket.id) {
        accepted.push({ id: ticket.id, token: chunk[j] });
      } else if (ticket.status === "error") {
        if (ticket.details?.error === "DeviceNotRegistered") dead.push(chunk[j]);
        else console.error(`[expo-push] ticket error token=${redactId(chunk[j])}: ${ticket.details?.error ?? ticket.message}`);
      }
    });

    try {
      if (accepted.length) await db.insert(expoPushTickets).values(accepted).onConflictDoNothing();
      await deleteTokens(dead, "ticket");
    } catch (err) {
      console.error("[expo-push] ticket bookkeeping failed:", err);
    }
  }
}

/**
 * Reads the receipts of tickets old enough to have one, prunes tokens Expo
 * reports as DeviceNotRegistered, and drops tickets past the receipt window.
 */
export async function checkExpoPushReceipts(): Promise<{ checked: number; pruned: number }> {
  const now = Date.now();
  await db
    .delete(expoPushTickets)
    .where(lt(expoPushTickets.createdAt, new Date(now - RECEIPT_EXPIRY_MS)));

  const tickets = await db
    .select()
    .from(expoPushTickets)
    .where(lt(expoPushTickets.createdAt, new Date(now - RECEIPT_READY_MS)));

  let checked = 0;
  let pruned = 0;
  for (let i = 0; i < tickets.length; i += RECEIPT_CHUNK) {
    const chunk = tickets.slice(i, i + RECEIPT_CHUNK);
    const receipts = await postExpo<Record<string, ExpoResult>>(RECEIPTS_URL, {
      ids: chunk.map((t) => t.id),
    });
    if (!receipts) continue;

    // A ticket without a receipt yet stays for the next run (until it expires).
    const done = chunk.filter((t) => receipts[t.id]);
    const dead = new Set<string>();
    for (const t of done) {
      const receipt = receipts[t.id];
      if (receipt.status !== "error") continue;
      if (receipt.details?.error === "DeviceNotRegistered") dead.add(t.token);
      else console.error(`[expo-push] receipt error token=${redactId(t.token)}: ${receipt.details?.error ?? receipt.message}`);
    }

    if (done.length) {
      await db.delete(expoPushTickets).where(inArray(expoPushTickets.id, done.map((t) => t.id)));
    }
    await deleteTokens([...dead], "receipt");
    checked += done.length;
    pruned += dead.size;
  }
  return { checked, pruned };
}
