import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { normalizeLocale } from "@/lib/locale";

// Served at /manifest.webmanifest. Locale is read from the NEXT_LOCALE cookie
// set by the next-intl middleware. When the browser fetches the manifest, it
// sends the cookie alongside the request so we can render PWA name/shortcuts
// in the user's language.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("NEXT_LOCALE")?.value);
  const t = await getTranslations({ locale, namespace: "manifest" });

  const shortcutBase = locale === "en" ? "/en" : "/tr";
  const todayUrl = `${shortcutBase}/?utm_source=pwa_shortcut`;
  const assistantUrl = locale === "en"
    ? "/en/assistant?utm_source=pwa_shortcut"
    : "/tr/asistan?utm_source=pwa_shortcut";
  const progressUrl = locale === "en"
    ? "/en/progress?utm_source=pwa_shortcut"
    : "/tr/ilerleme?utm_source=pwa_shortcut";

  return {
    name: t("name"),
    short_name: t("shortName"),
    description: t("description"),
    id: "/",
    scope: "/",
    start_url: `${shortcutBase}/`,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    prefer_related_applications: false,
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "portrait",
    lang: locale,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["health", "fitness"],
    shortcuts: [
      {
        name: t("todayName"),
        short_name: t("todayShortName"),
        description: t("todayDescription"),
        url: todayUrl,
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: t("assistantName"),
        short_name: t("assistantShortName"),
        description: t("assistantDescription"),
        url: assistantUrl,
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: t("progressName"),
        short_name: t("progressShortName"),
        description: t("progressDescription"),
        url: progressUrl,
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
