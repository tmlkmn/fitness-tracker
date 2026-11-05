import type { MetadataRoute } from "next";
import { isPublicSignupEnabled } from "@/lib/feature-flags";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fitmusc.com";

// Hybrid policy: only public marketing/legal pages are crawlable; everything
// else (app + auth screens) is closed via the trailing `Disallow: /`. Pricing
// is added to the allow-list only when self-serve signup is live — kept in sync
// with sitemap.ts and the page's flag-based noindex.
export default function robots(): MetadataRoute.Robots {
  const allow = [
    "/tr/tanitim",
    "/en/about",
    "/tr/gizlilik",
    "/en/privacy",
    "/tr/kvkk",
    "/en/kvkk",
    "/tr/kullanim-sartlari",
    "/en/terms",
    "/tr/iade-politikasi",
    "/en/refund-policy",
    "/tr/cerez-politikasi",
    "/en/cookie-policy",
    "/tr/iletisim",
    "/en/contact",
  ];

  if (isPublicSignupEnabled()) {
    allow.push("/tr/fiyatlandirma", "/en/pricing");
  }

  return {
    rules: { userAgent: "*", allow, disallow: "/" },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
