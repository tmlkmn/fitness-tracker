import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Mail } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("title"), robots: { index: true, follow: true } };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const isEn = (await getLocale()) === "en";
  const supportEmail =
    process.env.COMPANY_SUPPORT_EMAIL ?? "destek@fitmusc.com";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        &larr; {isEn ? "Home" : "Ana Sayfa"}
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="flex items-center gap-2 text-sm">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{t("emailLabel")}:</span>
        <a
          href={`mailto:${supportEmail}`}
          className="text-primary hover:underline"
        >
          {supportEmail}
        </a>
      </div>

      <ContactForm />
    </div>
  );
}
