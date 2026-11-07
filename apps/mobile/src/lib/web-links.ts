import type { Locale } from "@fitmusc/shared/locale";
import * as WebBrowser from "expo-web-browser";

import { API_URL } from "./config";

// Web pages the app sends people to for flows it doesn't have (localized
// paths from apps/web/src/i18n/routing.ts).
const PATHS = {
  home: { tr: "", en: "" },
  forgotPassword: { tr: "/sifremi-unuttum", en: "/forgot-password" },
  changePassword: { tr: "/sifre-degistir", en: "/change-password" },
  disclaimer: { tr: "/feragatname", en: "/disclaimer" },
  privacy: { tr: "/gizlilik", en: "/privacy" },
  terms: { tr: "/kullanim-sartlari", en: "/terms" },
  kvkk: { tr: "/kvkk", en: "/kvkk" },
} as const satisfies Record<string, Record<Locale, string>>;

export function openWebPage(page: keyof typeof PATHS, locale: Locale) {
  return WebBrowser.openBrowserAsync(`${API_URL}/${locale}${PATHS[page][locale]}`);
}
