import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { normalizeLocale } from "@/lib/locale";
import { buildPublicMetadata } from "@/lib/seo-metadata";
import { isPublicSignupEnabled } from "@/lib/feature-flags";
import TanitimClient from "./tanitim-client";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fitmusc.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "landing.seo" });
  return buildPublicMetadata({
    href: "/tanitim",
    locale: normalizeLocale(locale),
    title: t("title"),
    description: t("description"),
  });
}

export default async function TanitimPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "landing.seo" });
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FitMusc",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    description: t("description"),
    author: { "@type": "Organization", name: "FitMusc", url: BASE_URL },
  };
  // Only advertise an Offer once self-serve signup/pricing is live; an invite-
  // only app with a "price: 0" offer is misleading to search engines.
  if (isPublicSignupEnabled()) {
    jsonLd.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "TRY",
      url: `${BASE_URL}${locale === "en" ? "/en/pricing" : "/tr/fiyatlandirma"}`,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TanitimClient />
    </>
  );
}
