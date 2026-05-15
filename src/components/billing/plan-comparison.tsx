"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  PRICING,
  type BillingTier,
  type BillingInterval,
} from "@/lib/billing/tier-config";
import { useCheckout } from "@/hooks/use-billing";
import { IyzicoCheckoutForm } from "./iyzico-checkout-form";

interface PlanComparisonProps {
  // "signup" links to /kayit; "checkout" starts a paid checkout for the
  // signed-in user.
  mode: "signup" | "checkout";
  currentTier?: BillingTier | null;
  // Only relevant for mode="signup": when false the CTA is disabled and an
  // invite-only note is shown.
  signupEnabled?: boolean;
  // Resolved server-side from locale + IP. iyzico checkout opens an inline
  // billing form; Lemon Squeezy redirects to a hosted page.
  gateway?: "lemonsqueezy" | "iyzico";
}

const TIERS: BillingTier[] = ["pro", "elite"];

export function PlanComparison({
  mode,
  currentTier,
  signupEnabled = false,
  gateway = "lemonsqueezy",
}: PlanComparisonProps) {
  const t = useTranslations("pricing");
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const [iyzicoPlan, setIyzicoPlan] = useState<{
    tier: BillingTier;
    interval: BillingInterval;
  } | null>(null);
  const checkout = useCheckout();

  if (iyzicoPlan) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setIyzicoPlan(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("title")}
        </button>
        <IyzicoCheckoutForm
          tier={iyzicoPlan.tier}
          interval={iyzicoPlan.interval}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Monthly / yearly toggle */}
      <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1 w-fit mx-auto">
        {(["monthly", "yearly"] as BillingInterval[]).map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => setInterval(iv)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              interval === iv
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t(iv)}
            {iv === "yearly" && (
              <span className="ml-1 text-xs text-primary">
                · {t("yearlySave")}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TIERS.map((tier) => {
          const price = PRICING[tier][interval];
          const features = t.raw(`plans.${tier}.features`) as string[];
          const isCurrent = mode === "checkout" && currentTier === tier;
          const isElite = tier === "elite";
          const checkoutPending =
            checkout.isPending && checkout.variables?.tier === tier;

          return (
            <Card
              key={tier}
              className={isElite ? "border-primary" : undefined}
            >
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">
                      {t(`plans.${tier}.name`)}
                    </h3>
                    {isElite && (
                      <Badge variant="secondary">{t("mostPopular")}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(`plans.${tier}.tagline`)}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {interval === "monthly" ? t("perMonth") : t("perYear")}
                  </span>
                </div>

                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {mode === "signup" ? (
                  signupEnabled ? (
                    <Button
                      asChild
                      className="w-full"
                      variant={isElite ? "default" : "outline"}
                    >
                      <Link href="/kayit">{t("cta")}</Link>
                    </Button>
                  ) : (
                    <Button className="w-full" disabled>
                      {t("cta")}
                    </Button>
                  )
                ) : isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    {t("ctaCurrent")}
                  </Button>
                ) : gateway === "iyzico" ? (
                  <Button
                    className="w-full"
                    variant={isElite ? "default" : "outline"}
                    onClick={() => setIyzicoPlan({ tier, interval })}
                  >
                    {t("cta")}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isElite ? "default" : "outline"}
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate({ tier, interval })}
                  >
                    {checkoutPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {t("cta")}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {mode === "signup" && !signupEnabled && (
        <p className="text-xs text-muted-foreground text-center">
          {t("inviteOnlyNote")}
        </p>
      )}
      <p className="text-xs text-muted-foreground text-center">
        {t("trialNote")}
      </p>
    </div>
  );
}
