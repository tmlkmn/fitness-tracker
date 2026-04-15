import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-client";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "./sw-register";

export const metadata: Metadata = {
  title: "Fitness Tracker",
  description: "Kişisel fitness antrenman ve beslenme takip uygulaması",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitTrack",
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
