import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-client";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "./sw-register";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { NetworkStatus } from "@/components/layout/network-status";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CookieConsent } from "@/components/cookie-consent";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fitmusc.com";

export const metadata: Metadata = {
  title: {
    default: "FitMusc — Kişisel Fitness Takip",
    template: "%s | FitMusc",
  },
  description: "AI destekli kişisel fitness antrenman ve beslenme takip uygulaması. Haftalık antrenman ve beslenme planları, ilerleme takibi, akıllı öneriler.",
  manifest: "/manifest.json",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "FitMusc — Kişisel Fitness Takip",
    description: "AI destekli kişisel fitness antrenman ve beslenme takip uygulaması.",
    type: "website",
    locale: "tr_TR",
    siteName: "FitMusc",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitMusc — Kişisel Fitness Takip",
    description: "AI destekli kişisel fitness antrenman ve beslenme takip uygulaması.",
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

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
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
              description: "AI destekli kişisel fitness antrenman ve beslenme takip uygulaması.",
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
        <QueryProvider>
          <ThemeProvider>
            <NetworkStatus />
            <PullToRefresh>
              <main className="pb-24 max-w-lg mx-auto">{children}</main>
            </PullToRefresh>
            <BottomNav />
            <Toaster />
            <CookieConsent />
            <SwRegister />
          </ThemeProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
