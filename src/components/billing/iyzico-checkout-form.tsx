"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { BillingTier, BillingInterval } from "@/lib/billing/tier-config";

const TCKN_REGEX = /^\d{11}$/;
const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

interface IyzicoCheckoutFormProps {
  tier: BillingTier;
  interval: BillingInterval;
}

/**
 * Collects the billing data iyzico legally requires (name, TCKN, address),
 * starts a subscription checkout, then renders iyzico's hosted form snippet.
 */
export function IyzicoCheckoutForm({ tier, interval }: IyzicoCheckoutFormProps) {
  const t = useTranslations("billing.iyzicoForm");
  const [fullName, setFullName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (fullName.trim().length < 3) return setError(t("errors.fullName"));
    if (!TCKN_REGEX.test(identityNumber)) {
      return setError(t("errors.identityNumber"));
    }
    if (!line1.trim() || !city.trim()) return setError(t("errors.address"));
    if (!consent) return setError(t("errors.consent"));

    setLoading(true);
    try {
      const res = await fetch("/api/checkout/iyzico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          interval,
          fullName: fullName.trim(),
          identityNumber,
          phone: phone.trim(),
          address: {
            line1: line1.trim(),
            city: city.trim(),
            country: "Türkiye",
            zip: zip.trim() || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error("checkout failed");
      const { checkoutFormContent } = (await res.json()) as {
        checkoutFormContent: string;
      };

      setStarted(true);
      // createContextualFragment executes the <script> iyzico returns, which
      // renders the hosted form into #iyzipay-checkout-form.
      const container = document.getElementById("iyzipay-checkout-form");
      if (container) {
        const fragment = document
          .createRange()
          .createContextualFragment(checkoutFormContent);
        container.appendChild(fragment);
      }
    } catch {
      setError(t("errors.generic"));
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-bold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        </div>

        {started ? (
          <div id="iyzipay-checkout-form" className="min-h-24">
            <p className="text-sm text-muted-foreground">{t("processing")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="fullName" className="text-sm font-medium">
                {t("fullName")}
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="tckn" className="text-sm font-medium">
                {t("identityNumber")}
              </label>
              <input
                id="tckn"
                value={identityNumber}
                onChange={(e) =>
                  setIdentityNumber(e.target.value.replace(/\D/g, ""))
                }
                maxLength={11}
                inputMode="numeric"
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="phone" className="text-sm font-medium">
                {t("phone")}
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                autoComplete="tel"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="line1" className="text-sm font-medium">
                {t("addressLine")}
              </label>
              <input
                id="line1"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className={inputClass}
                autoComplete="street-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="city" className="text-sm font-medium">
                  {t("city")}
                </label>
                <input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="zip" className="text-sm font-medium">
                  {t("zip")}
                </label>
                <input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className={inputClass}
                  inputMode="numeric"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {t("kvkkConsent")}{" "}
                <Link href="/kvkk" className="text-primary hover:underline">
                  KVKK
                </Link>
              </span>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("submit")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
