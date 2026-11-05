import type { MetadataRoute } from "next";
import { isPublicSignupEnabled } from "@/lib/feature-flags";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fitmusc.com";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

// [trPath, enPath, changeFrequency, priority, lastModified]. Use real content
// dates (not `new Date()`) so lastmod is stable across requests/crawls. When
// enPath === trPath (TR-only canonical) only one entry is emitted.
const PUBLIC_PAIRS: Array<[string, string, Freq, number, string]> = [
  ["/tr/tanitim", "/en/about", "monthly", 1, "2026-05-01"],
  ["/tr/gizlilik", "/en/privacy", "yearly", 0.3, "2026-04-20"],
  ["/tr/kvkk", "/en/kvkk", "yearly", 0.3, "2026-04-20"],
  ["/tr/kullanim-sartlari", "/en/terms", "yearly", 0.3, "2026-04-20"],
  ["/tr/iade-politikasi", "/en/refund-policy", "yearly", 0.3, "2026-05-15"],
  ["/tr/cerez-politikasi", "/en/cookie-policy", "yearly", 0.3, "2026-05-15"],
  ["/tr/iletisim", "/en/contact", "yearly", 0.4, "2026-05-01"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const pairs = [...PUBLIC_PAIRS];

  // Pricing is only a public, indexable destination once self-serve signup is
  // live. While invite-only it stays noindex and out of the sitemap.
  if (isPublicSignupEnabled()) {
    pairs.splice(1, 0, [
      "/tr/fiyatlandirma",
      "/en/pricing",
      "monthly",
      0.8,
      "2026-05-01",
    ]);
  }

  return pairs.flatMap(([trPath, enPath, changeFrequency, priority, lastmod]) => {
    const lastModified = new Date(lastmod);
    const entries: MetadataRoute.Sitemap = [
      { url: `${BASE_URL}${trPath}`, lastModified, changeFrequency, priority },
    ];
    if (enPath !== trPath) {
      entries.push({
        url: `${BASE_URL}${enPath}`,
        lastModified,
        changeFrequency,
        priority,
      });
    }
    return entries;
  });
}
