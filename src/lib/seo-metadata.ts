import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/routing";
import type { Locale } from "@/lib/locale";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fitmusc.com";

/**
 * Builds locale-aware metadata for indexable public pages: a self-referencing
 * canonical plus tr / en / x-default hreflang alternates. URLs are derived from
 * the next-intl routing map via getPathname (single source of truth — never
 * hand-build localized paths), so /tr/tanitim ↔ /en/about stay in sync with
 * routing.ts. openGraph/twitter mirror the locale shape used in the layout.
 */
export function buildPublicMetadata({
  href,
  locale,
  title,
  description,
}: {
  href: AppPathname;
  locale: Locale;
  title: string;
  description: string;
}): Metadata {
  const urlFor = (l: Locale) =>
    `${BASE_URL}${getPathname({ href: href as never, locale: l })}`;

  const canonical = urlFor(locale);
  const languages: Record<string, string> = {
    tr: urlFor("tr"),
    en: urlFor("en"),
    "x-default": urlFor("tr"),
  };

  return {
    title,
    description,
    // Public pages opt into indexing; the [locale] layout defaults everything
    // else (app + auth screens) to noindex. Callers may still override (e.g.
    // pricing stays noindex while invite-only).
    robots: { index: true, follow: true },
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      type: "website",
      locale: locale === "en" ? "en_US" : "tr_TR",
      siteName: "FitMusc",
      url: canonical,
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}
