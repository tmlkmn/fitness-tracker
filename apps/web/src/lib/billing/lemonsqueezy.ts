import {
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
  cancelSubscription,
  updateSubscription,
} from "@lemonsqueezy/lemonsqueezy.js";
import type { BillingInterval, BillingTier } from "@/lib/billing/tier-config";
import type { Locale } from "@/lib/locale";

let configured = false;

function ensureSetup(): void {
  if (configured) return;
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error("LEMONSQUEEZY_API_KEY is not configured");
  }
  lemonSqueezySetup({ apiKey });
  configured = true;
}

// Variant IDs are created in the Lemon Squeezy dashboard (Sprint 0) and never
// hardcoded — one per tier+interval combination.
function variantId(tier: BillingTier, interval: BillingInterval): string {
  const key = `LS_${tier.toUpperCase()}_${interval.toUpperCase()}_VARIANT_ID`;
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}

const TIER_INTERVAL_COMBOS: Array<[BillingTier, BillingInterval]> = [
  ["pro", "monthly"],
  ["pro", "yearly"],
  ["elite", "monthly"],
  ["elite", "yearly"],
];

/**
 * Reverse-maps a Lemon Squeezy variant ID back to our tier+interval — used by
 * the webhook to record what the customer actually subscribed to.
 */
export function resolveVariant(
  id: string,
): { tier: BillingTier; interval: BillingInterval } | null {
  for (const [tier, interval] of TIER_INTERVAL_COMBOS) {
    const envKey = `LS_${tier.toUpperCase()}_${interval.toUpperCase()}_VARIANT_ID`;
    if (process.env[envKey] === id) {
      return { tier, interval };
    }
  }
  return null;
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

export interface CreateCheckoutInput {
  userId: string;
  email: string;
  tier: BillingTier;
  interval: BillingInterval;
  locale: Locale;
}

/**
 * Creates a Lemon Squeezy hosted checkout and returns its URL. The userId is
 * passed in custom data so the webhook can map the resulting subscription back
 * to our user without relying on email matching.
 */
export async function createCheckoutUrl(
  input: CreateCheckoutInput,
): Promise<string> {
  ensureSetup();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) {
    throw new Error("LEMONSQUEEZY_STORE_ID is not configured");
  }

  const settingsPath = input.locale === "en" ? "/en/settings/billing" : "/tr/ayarlar/odeme";

  const { data, error } = await createCheckout(
    storeId,
    variantId(input.tier, input.interval),
    {
      checkoutData: {
        email: input.email,
        custom: { user_id: input.userId },
      },
      productOptions: {
        redirectUrl: `${appUrl()}${settingsPath}?checkout=success`,
      },
      checkoutOptions: { embed: false },
    },
  );

  if (error || !data?.data.attributes.url) {
    throw new Error(`Lemon Squeezy checkout failed: ${error?.message ?? "no url"}`);
  }
  return data.data.attributes.url;
}

export async function fetchSubscription(subscriptionId: string) {
  ensureSetup();
  const { data, error } = await getSubscription(subscriptionId);
  if (error || !data) {
    throw new Error(`Lemon Squeezy subscription fetch failed: ${error?.message}`);
  }
  return data.data;
}

export async function cancelLsSubscription(subscriptionId: string): Promise<void> {
  ensureSetup();
  const { error } = await cancelSubscription(subscriptionId);
  if (error) {
    throw new Error(`Lemon Squeezy cancel failed: ${error.message}`);
  }
}

export async function resumeLsSubscription(subscriptionId: string): Promise<void> {
  ensureSetup();
  const { error } = await updateSubscription(subscriptionId, { cancelled: false });
  if (error) {
    throw new Error(`Lemon Squeezy resume failed: ${error.message}`);
  }
}

/**
 * Returns the Lemon Squeezy hosted customer portal URL for a subscription —
 * used for PCI-sensitive actions (card update) we deliberately don't build
 * ourselves.
 */
export async function getCustomerPortalUrl(
  subscriptionId: string,
): Promise<string | null> {
  const subscription = await fetchSubscription(subscriptionId);
  return subscription.attributes.urls.customer_portal ?? null;
}
