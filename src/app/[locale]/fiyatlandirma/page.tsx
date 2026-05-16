import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { isPublicSignupEnabled } from "@/lib/feature-flags";
import { countryFromHeaders } from "@/lib/billing/gateway-router";
import { currencyForCountry } from "@/lib/billing/currency";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return {
    title: t("title"),
    // Keep pricing out of search indexes while the app is invite-only.
    robots: isPublicSignupEnabled()
      ? undefined
      : { index: false, follow: false },
  };
}

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const locale = await getLocale();
  const isEn = locale === "en";
  const faq = t.raw("faq") as { q: string; a: string }[];
  const displayCurrency = currencyForCountry(
    countryFromHeaders(await headers()),
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        &larr; {isEn ? "Home" : "Ana Sayfa"}
      </Link>

      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <PlanComparison
        mode="signup"
        signupEnabled={isPublicSignupEnabled()}
        displayCurrency={displayCurrency}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("faqTitle")}</h2>
        <div className="space-y-4">
          {faq.map((item) => (
            <div key={item.q}>
              <h3 className="text-sm font-medium">{item.q}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
