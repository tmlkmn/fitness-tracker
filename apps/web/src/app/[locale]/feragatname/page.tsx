import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { normalizeLocale } from "@/lib/locale";
import { buildPublicMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
  const t = await getTranslations({ locale, namespace: "disclaimer" });
  return {
    ...buildPublicMetadata({
      href: "/feragatname",
      locale,
      title: t("page.title"),
      description: t("page.description"),
    }),
    robots: { index: true, follow: true },
  };
}

export default async function DisclaimerPage() {
  const locale = normalizeLocale(await getLocale());
  const t = await getTranslations({ locale, namespace: "disclaimer" });
  const isEn = locale === "en";

  const sections = [
    { title: t("page.generalTitle"), body: t("page.generalBody") },
    { title: t("page.medicalTitle"), body: t("page.medicalBody") },
    { title: t("page.aiTitle"), body: t("page.aiBody") },
    { title: t("page.liabilityTitle"), body: t("page.liabilityBody") },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        &larr; {isEn ? "Home" : "Ana Sayfa"}
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("page.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("page.lastUpdated")}: {t("page.lastUpdatedDate")}
        </p>
      </header>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>{t("page.intro")}</p>

        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              {section.title}
            </h2>
            <p>{section.body}</p>
          </div>
        ))}

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t("page.contactTitle")}
          </h2>
          <p>
            {t("page.contactBody")}{" "}
            <Link href="/iletisim" className="text-primary hover:underline">
              {t("page.contactLink")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
