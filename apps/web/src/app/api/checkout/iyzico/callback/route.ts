import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/api-auth";
import { getUserLocale } from "@/lib/locale";
import { retrieveSubscriptionCheckout } from "@/lib/billing/iyzico";
import { isBillingTier, isBillingInterval } from "@/lib/billing/tier-config";

/**
 * iyzico posts the user's browser back here after the hosted checkout. Since
 * the browser carries the session cookie the callback is authenticated; it
 * verifies the result by token and links the subscription to the user.
 * tier + interval ride along as query params (set on the callback URL).
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier");
  const interval = searchParams.get("interval");

  // Callback runs before the subscription is fully linked — entitlement may
  // still be inactive. Just ensure there is an authenticated session.
  const { user, response } = await requireApiUser({
    requireApproved: false,
    requireActiveBilling: false,
  });
  if (response) {
    return NextResponse.redirect(new URL("/tr/giris", request.url));
  }

  const locale = getUserLocale(user);
  const billingPath =
    locale === "en" ? "/en/settings/billing" : "/tr/ayarlar/odeme";
  const redirect = (result: "success" | "failed") =>
    NextResponse.redirect(
      new URL(`${billingPath}?checkout=${result}`, request.url),
    );

  let token = "";
  try {
    const form = await request.formData();
    token = String(form.get("token") ?? "");
  } catch {
    return redirect("failed");
  }
  if (!token) return redirect("failed");

  try {
    const result = await retrieveSubscriptionCheckout(token);
    const active = result.subscriptionStatus.toUpperCase() === "ACTIVE";

    if (active && isBillingTier(tier) && isBillingInterval(interval)) {
      await db
        .update(users)
        .set({
          billingProvider: "iyzico",
          billingTier: tier,
          billingInterval: interval,
          subscriptionStatus: "active",
          iyzicoSubscriptionRef: result.subscriptionReferenceCode,
          iyzicoCustomerRef: result.customerReferenceCode,
          paymentFailedAt: null,
          cancelledAt: null,
          isApproved: true,
        })
        .where(eq(users.id, user.id));
      return redirect("success");
    }
    return redirect("failed");
  } catch {
    return redirect("failed");
  }
}
