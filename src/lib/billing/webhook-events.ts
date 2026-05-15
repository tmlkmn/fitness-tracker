import { db } from "@/db";
import { webhookEvents } from "@/db/schema";

export type WebhookProvider = "lemonsqueezy" | "iyzico";

/**
 * Records a webhook event for idempotency. Returns false when the event was
 * already processed — the unique (provider, externalId) index conflicts — so
 * the caller can short-circuit and skip side effects.
 */
export async function recordWebhookEvent(
  provider: WebhookProvider,
  externalId: string,
  eventName: string | null,
  payload: unknown,
): Promise<boolean> {
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider, externalId, eventName, payload })
    .onConflictDoNothing({
      target: [webhookEvents.provider, webhookEvents.externalId],
    })
    .returning({ id: webhookEvents.id });
  return inserted.length > 0;
}
