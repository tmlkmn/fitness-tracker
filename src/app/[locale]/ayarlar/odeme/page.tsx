import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BillingCard } from "@/components/billing/billing-card";
import { InvoiceHistory } from "@/components/billing/invoice-history";
import { TrialBanner } from "@/components/billing/trial-banner";
import { resolveGateway } from "@/lib/billing/resolve-gateway";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function BillingSettingsPage() {
  const t = await getTranslations("billing");
  const isEn = (await getLocale()) === "en";
  const gateway = await resolveGateway();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <Link
        href="/ayarlar"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        &larr; {isEn ? "Settings" : "Ayarlar"}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <TrialBanner />
      <BillingCard gateway={gateway} />
      <InvoiceHistory />
    </div>
  );
}
