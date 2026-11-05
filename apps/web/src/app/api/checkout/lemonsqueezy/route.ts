import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { createCheckoutUrl } from "@/lib/billing/lemonsqueezy";
import { isBillingTier, isBillingInterval } from "@/lib/billing/tier-config";
import { getUserLocale } from "@/lib/locale";

/**
 * Redirects an authenticated user to a Lemon Squeezy hosted checkout. Used as
 * a plain link target so the browser navigates straight to the LS page.
 */
export async function GET(request: NextRequest) {
  // Checkout itself is how the user obtains entitlement — don't gate on it.
  const { user, response } = await requireApiUser({
    requireApproved: false,
    requireActiveBilling: false,
  });
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier");
  const interval = searchParams.get("interval");
  if (!isBillingTier(tier) || !isBillingInterval(interval)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const url = await createCheckoutUrl({
      userId: user.id,
      email: user.email,
      tier,
      interval,
      locale: getUserLocale(user),
    });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
