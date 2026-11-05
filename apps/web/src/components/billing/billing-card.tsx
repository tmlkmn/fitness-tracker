"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, AlertTriangle } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import {
  useBilling,
  useCancelSubscription,
  useResumeSubscription,
  useCustomerPortal,
} from "@/hooks/use-billing";
import { PlanComparison } from "./plan-comparison";

// Subscription states that have a provider-managed subscription object.
const MANAGED = ["active", "past_due", "cancelled"];

interface BillingCardProps {
  gateway?: "lemonsqueezy" | "iyzico";
}

export function BillingCard({ gateway }: BillingCardProps) {
  const t = useTranslations("billing");
  const locale = useLocale() as Locale;
  const { data: billing, isLoading } = useBilling();
  const cancel = useCancelSubscription();
  const resume = useResumeSubscription();
  const portal = useCustomerPortal();

  if (isLoading || !billing) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { status, tier } = billing;
  const isManaged = MANAGED.includes(status);
  const statusBadgeVariant =
    status === "expired" || status === "past_due" ? "destructive" : "secondary";

  const date = (d: Date | null) => (d ? formatDate(d, locale) : null);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("currentPlan")}</span>
            </div>
            <Badge variant={statusBadgeVariant}>
              {t(`status.${status}`)}
            </Badge>
          </div>

          {isManaged && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("currentPlan")}
                </span>
                <span className="font-medium">
                  {tier === "elite" ? "Elite" : "Pro"}
                  {billing.interval
                    ? ` · ${t(`interval.${billing.interval}`)}`
                    : ""}
                </span>
              </div>
              {billing.nextBillingDate && status !== "cancelled" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("renewsOn", { date: date(billing.nextBillingDate)! })}
                  </span>
                </div>
              )}
              {billing.nextBillingDate && status === "cancelled" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("endsOn", { date: date(billing.nextBillingDate)! })}
                  </span>
                </div>
              )}
              {billing.paymentFailedAt && (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t("paymentFailed")}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={portal.isPending}
                  onClick={() => portal.mutate()}
                >
                  {portal.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {t("updatePayment")}
                </Button>
                {status === "cancelled" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resume.isPending}
                    onClick={() => resume.mutate()}
                  >
                    {resume.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {t("resume")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (confirm(t("cancelConfirm"))) cancel.mutate();
                    }}
                  >
                    {cancel.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {t("cancel")}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* No managed subscription — offer the plans. */}
      {!isManaged && status !== "admin" && (
        <PlanComparison mode="checkout" gateway={gateway} />
      )}
    </div>
  );
}
