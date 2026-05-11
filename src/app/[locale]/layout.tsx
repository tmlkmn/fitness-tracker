import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

import { QueryProvider } from "@/lib/query-client";
import { BottomNav } from "@/components/layout/bottom-nav";
import { QuickActionFab } from "@/components/layout/quick-action-fab";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "./sw-register";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { NetworkStatus } from "@/components/layout/network-status";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CookieConsent } from "@/components/cookie-consent";
import { GlobalSearchProvider } from "@/components/layout/global-search-provider";
import { routing } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fitmusc.com";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("title");
  const description = t("description");

  return {
    title: {
      default: title,
      template: `%s | FitMusc`,
    },
    description,
    manifest: "/manifest.webmanifest",
    metadataBase: new URL(BASE_URL),
    openGraph: {
      title,
      description,
      type: "website",
      locale: locale === "en" ? "en_US" : "tr_TR",
      siteName: "FitMusc",
      url: BASE_URL,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32" },
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "FitMusc",
    },
  };
}

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "metadata" });
  const description = t("description");

  return (
    <html
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "FitMusc",
              applicationCategory: "HealthApplication",
              operatingSystem: "Web",
              description,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "TRY",
              },
              author: {
                "@type": "Organization",
                name: "FitMusc",
                url: BASE_URL,
              },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light")document.documentElement.classList.remove("dark");else document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <NextIntlClientProvider locale={locale}>
          <QueryProvider>
            <ThemeProvider>
              <GlobalSearchProvider>
                <NetworkStatus />
                <PullToRefresh>
                  <main className="pb-24 max-w-lg md:max-w-2xl mx-auto">
                    <ViewTransition default="page-fade">{children}</ViewTransition>
                  </main>
                </PullToRefresh>
                <QuickActionFab />
                <BottomNav />
                <Toaster />
                <CookieConsent />
                <SwRegister />
              </GlobalSearchProvider>
            </ThemeProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
