import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth-utils";
import { createCheckoutUrl } from "@/lib/billing/lemonsqueezy";
import { isBillingTier, isBillingInterval } from "@/lib/billing/tier-config";
import { getUserLocale } from "@/lib/locale";

/**
 * Redirects an authenticated user to a Lemon Squeezy hosted checkout. Used as
 * a plain link target so the browser navigates straight to the LS page.
 */
export async function GET(request: NextRequest) {
  let user: Awaited<ReturnType<typeof getAuthSession>>;
  try {
    user = await getAuthSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
