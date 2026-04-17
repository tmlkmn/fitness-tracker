import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-client";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "./sw-register";

export const metadata: Metadata = {
  title: {
    default: "FitMusc — Kişisel Fitness Takip",
    template: "%s | FitMusc",
  },
  description: "Kişisel fitness antrenman ve beslenme takip uygulaması",
  manifest: "/manifest.json",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "FitMusc — Kişisel Fitness Takip",
    description: "Kişisel fitness antrenman ve beslenme takip uygulaması",
    type: "website",
    locale: "tr_TR",
    siteName: "FitMusc",
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
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <QueryProvider>
          <main className="pb-24 max-w-lg mx-auto">{children}</main>
          <BottomNav />
          <Toaster />
          <SwRegister />
        </QueryProvider>
      </body>
    </html>
  );
}
