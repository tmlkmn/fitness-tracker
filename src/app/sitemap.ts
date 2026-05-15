import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fitmusc.com";

const PUBLIC_PAIRS: Array<[string, string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
  ["/tr/tanitim", "/en/about", "monthly", 1],
  ["/tr/fiyatlandirma", "/en/pricing", "monthly", 0.8],
  ["/tr/gizlilik", "/en/privacy", "yearly", 0.3],
  ["/tr/kvkk", "/tr/kvkk", "yearly", 0.3],
  ["/tr/kullanim-sartlari", "/en/terms", "yearly", 0.3],
  ["/tr/iade-politikasi", "/en/refund-policy", "yearly", 0.3],
  ["/tr/cerez-politikasi", "/en/cookie-policy", "yearly", 0.3],
  ["/tr/iletisim", "/en/contact", "yearly", 0.4],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_PAIRS.flatMap(([trPath, enPath, changeFrequency, priority]) => {
    const entries: MetadataRoute.Sitemap = [
      {
        url: `${BASE_URL}${trPath}`,
        lastModified: now,
        changeFrequency,
        priority,
      },
    ];
    if (enPath !== trPath) {
      entries.push({
        url: `${BASE_URL}${enPath}`,
        lastModified: now,
        changeFrequency,
        priority,
      });
    }
    return entries;
  });
}
