import crypto from "node:crypto";
import Iyzipay from "iyzipay";
import type { BillingInterval, BillingTier } from "@/lib/billing/tier-config";
import type { BillingAddress } from "@/db/schema";
import type { Locale } from "@/lib/locale";

interface IyzipayResult {
  status: "success" | "failure";
  errorMessage?: string;
  [key: string]: unknown;
}

// Safely coerces an unknown API field to a string (objects → "").
function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

let client: Iyzipay | null = null;

function baseUrl(): string {
  return process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com";
}

function getClient(): Iyzipay {
  if (!client) {
    const apiKey = process.env.IYZICO_API_KEY;
    const secretKey = process.env.IYZICO_SECRET_KEY;
    if (!apiKey || !secretKey) {
      throw new Error("IYZICO_API_KEY / IYZICO_SECRET_KEY are not configured");
    }
    client = new Iyzipay({ apiKey, secretKey, uri: baseUrl() });
  }
  return client;
}

// Pricing plan reference codes are created in the iyzico dashboard (Sprint 0).
function pricingPlanRef(tier: BillingTier, interval: BillingInterval): string {
  const key = `IYZICO_${tier.toUpperCase()}_${interval.toUpperCase()}_REF`;
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

// Bridges iyzico's callback-style SDK into a promise, rejecting on the
// "failure" status the API returns instead of throwing.
function promisify(
  invoke: (cb: (err: Error | null, result: IyzipayResult) => void) => void,
): Promise<IyzipayResult> {
  return new Promise((resolve, reject) => {
    invoke((err, result) => {
      if (err) return reject(err);
      if (!result || result.status === "failure") {
        return reject(
          new Error(result?.errorMessage ?? "iyzico request failed"),
        );
      }
      resolve(result);
    });
  });
}

export interface IyzicoCheckoutInput {
  tier: BillingTier;
  interval: BillingInterval;
  locale: Locale;
  name: string;
  surname: string;
  email: string;
  phone: string;
  identityNumber: string;
  address: BillingAddress;
}

/**
 * Initializes an iyzico subscription checkout form. Returns the token (for
 * later linking) and the HTML/JS snippet to render the hosted form.
 */
export async function createSubscriptionCheckout(
  input: IyzicoCheckoutInput,
): Promise<{ token: string; checkoutFormContent: string }> {
  const addr = {
    contactName: input.address.fullName,
    city: input.address.city,
    country: input.address.country,
    address: input.address.line1,
    zipCode: input.address.zip ?? "",
  };

  // tier+interval ride along on the callback URL so the callback can apply
  // them without a separate token→plan store.
  const callbackUrl =
    `${appUrl()}/api/checkout/iyzico/callback` +
    `?tier=${input.tier}&interval=${input.interval}`;

  const result = await promisify((cb) =>
    getClient().subscriptionCheckoutForm.initialize(
      {
        locale: input.locale === "en" ? "en" : "tr",
        callbackUrl,
        pricingPlanReferenceCode: pricingPlanRef(input.tier, input.interval),
        subscriptionInitialStatus: "ACTIVE",
        customer: {
          name: input.name,
          surname: input.surname,
          email: input.email,
          gsmNumber: input.phone,
          identityNumber: input.identityNumber,
          billingAddress: addr,
          shippingAddress: addr,
        },
      },
      cb,
    ),
  );

  return {
    token: str(result.token),
    checkoutFormContent: str(result.checkoutFormContent),
  };
}

export async function cancelIyzicoSubscription(
  subscriptionReferenceCode: string,
): Promise<void> {
  await promisify((cb) =>
    getClient().subscription.cancel({ subscriptionReferenceCode }, cb),
  );
}

// ── Raw v2 signed request (SDK lacks a subscription checkout retrieve) ──

function v2AuthHeaders(uriPath: string, body: string) {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error("IYZICO_API_KEY / IYZICO_SECRET_KEY are not configured");
  }
  const randomKey = `${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(randomKey + uriPath + body)
    .digest("hex");
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return {
    Authorization: `IYZWSv2 ${Buffer.from(authString).toString("base64")}`,
    "x-iyzi-rnd": randomKey,
    "Content-Type": "application/json",
  };
}

export interface IyzicoSubscriptionResult {
  subscriptionStatus: string;
  subscriptionReferenceCode: string | null;
  customerReferenceCode: string | null;
  parentReferenceCode: string | null;
}

/**
 * Retrieves a subscription checkout form result by token. iyzico's Node SDK
 * has no method for this, so it is a raw v2-signed request.
 *
 * NOTE: the exact endpoint path + response shape must be confirmed against
 * the iyzico sandbox during Sprint 0 verification.
 */
export async function retrieveSubscriptionCheckout(
  token: string,
): Promise<IyzicoSubscriptionResult> {
  const uriPath = `/v2/subscription/checkout-form/${token}`;
  const res = await fetch(`${baseUrl()}${uriPath}`, {
    method: "GET",
    headers: v2AuthHeaders(uriPath, ""),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.status === "failure") {
    throw new Error(str(data.errorMessage) || "iyzico retrieve failed");
  }
  // The payload may be flat or nested under `data`.
  const nested = data.data;
  const sub = (
    data.subscriptionStatus || !nested ? data : nested
  ) as Record<string, unknown>;

  const subRef =
    str(sub.referenceCode) || str(sub.subscriptionReferenceCode) || null;

  return {
    subscriptionStatus: str(sub.subscriptionStatus) || "PENDING",
    subscriptionReferenceCode: subRef,
    customerReferenceCode: str(sub.customerReferenceCode) || null,
    parentReferenceCode: str(sub.parentReferenceCode) || null,
  };
}
