import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { users, type BillingAddress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/api-auth";
import { getUserLocale } from "@/lib/locale";
import { createSubscriptionCheckout } from "@/lib/billing/iyzico";
import { encryptIdentity } from "@/lib/billing/identity-encrypt";
import { isBillingTier, isBillingInterval } from "@/lib/billing/tier-config";

const TCKN_REGEX = /^\d{11}$/;

/**
 * Initializes an iyzico subscription checkout. The TCKN is encrypted at rest
 * and the billing address persisted (KVKK invoicing record). Returns the
 * iyzico checkout form snippet for the client to render.
 */
export async function POST(request: NextRequest) {
  // Checkout itself is how the user obtains entitlement — don't gate on it.
  const { user, response } = await requireApiUser({
    requireApproved: false,
    requireActiveBilling: false,
  });
  if (response) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tier, interval, fullName, identityNumber, phone } = body;
  const addr = body.address as Record<string, unknown> | undefined;

  if (!isBillingTier(tier) || !isBillingInterval(interval)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (typeof fullName !== "string" || fullName.trim().length < 3) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  if (typeof identityNumber !== "string" || !TCKN_REGEX.test(identityNumber)) {
    return NextResponse.json({ error: "Invalid identity" }, { status: 400 });
  }
  if (
    !addr ||
    typeof addr.line1 !== "string" ||
    typeof addr.city !== "string"
  ) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const surname = rest.join(" ") || firstName;

  const billingAddress: BillingAddress = {
    fullName: fullName.trim(),
    line1: addr.line1,
    city: addr.city,
    country: typeof addr.country === "string" ? addr.country : "Türkiye",
    zip: typeof addr.zip === "string" ? addr.zip : undefined,
    phone: typeof phone === "string" ? phone : undefined,
  };

  try {
    const { checkoutFormContent } = await createSubscriptionCheckout({
      tier,
      interval,
      locale: getUserLocale(user),
      name: firstName,
      surname,
      email: user.email,
      phone: typeof phone === "string" ? phone : "",
      identityNumber,
      address: billingAddress,
    });

    // Persist collected billing data — TCKN encrypted (KVKK sensitive data).
    await db
      .update(users)
      .set({
        iyzicoIdentityNumber: encryptIdentity(identityNumber),
        billingAddress,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ checkoutFormContent });
  } catch {
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
