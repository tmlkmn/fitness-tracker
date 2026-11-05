import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type WebhookProvider = "lemonsqueezy" | "iyzico";

/**
 * Runs a webhook handler with crash-safe idempotency.
 *
 * The naive pattern (insert dedup row first → run side effects) silently
 * drops events when side effects crash partway through: the row exists, so
 * the next replay short-circuits, but the user.update / invoice insert /
 * notification never landed.
 *
 * This helper claims the row with `succeededAt = null`, runs `handler`, then
 * flips `succeededAt` to now() on success. On replay:
 *   - row exists + succeededAt set → true duplicate, handler is skipped
 *   - row exists + succeededAt null → previous attempt crashed, handler runs again
 *   - no row → first attempt, handler runs
 *
 * Side effects MUST be idempotent at the destination (we already rely on
 * `onConflictDoNothing` for invoices, and user updates set absolute values).
 * Notifications can double-fire in the rare crash-after-notify-before-mark
 * window — accepted as the lesser evil compared to silently dropping the
 * subscription update.
 *
 * neon-http does not give us true serializable transactions, so this
 * two-phase approach is the safest equivalent we can implement.
 */
export async function withWebhookEvent(
  provider: WebhookProvider,
  externalId: string,
  eventName: string | null,
  payload: unknown,
  handler: () => Promise<void>,
): Promise<{ duplicate: boolean }> {
  // Phase 1: try to claim the row. On unique-conflict we already have a row
  // for this externalId — check whether the prior attempt completed.
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider, externalId, eventName, payload, succeededAt: null })
    .onConflictDoNothing({
      target: [webhookEvents.provider, webhookEvents.externalId],
    })
    .returning({ id: webhookEvents.id });

  if (inserted.length === 0) {
    const [existing] = await db
      .select({ succeededAt: webhookEvents.succeededAt })
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.provider, provider),
          eq(webhookEvents.externalId, externalId),
        ),
      );
    if (existing?.succeededAt) {
      return { duplicate: true };
    }
    // Fall through: previous attempt did not complete, allow retry.
  }

  // Phase 2: run side effects. If this throws, succeededAt stays NULL so the
  // next replay re-enters the handler.
  await handler();

  // Phase 3: mark the event as fully processed.
  await db
    .update(webhookEvents)
    .set({ succeededAt: new Date() })
    .where(
      and(
        eq(webhookEvents.provider, provider),
        eq(webhookEvents.externalId, externalId),
      ),
    );

  return { duplicate: false };
}
