import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "always",
  pathnames: {
    "/": "/",

    // Top-level
    "/takvim": { tr: "/takvim", en: "/calendar" },
    "/ilerleme": { tr: "/ilerleme", en: "/progress" },
    "/alisveris": { tr: "/alisveris", en: "/shopping" },
    "/ogunlerim": { tr: "/ogunlerim", en: "/my-meals" },
    "/asistan": { tr: "/asistan", en: "/assistant" },

    // Day detail (dynamic)
    "/gun/[dayId]": { tr: "/gun/[dayId]", en: "/day/[dayId]" },

    // Settings
    "/ayarlar": { tr: "/ayarlar", en: "/settings" },
    "/ayarlar/makro": { tr: "/ayarlar/makro", en: "/settings/macros" },
    "/ayarlar/bildirim": { tr: "/ayarlar/bildirim", en: "/settings/notifications" },
    "/ayarlar/paylasim": { tr: "/ayarlar/paylasim", en: "/settings/sharing" },
    "/ayarlar/rutin": { tr: "/ayarlar/rutin", en: "/settings/routine" },
    "/ayarlar/saglik": { tr: "/ayarlar/saglik", en: "/settings/health" },
    "/ayarlar/takviye": { tr: "/ayarlar/takviye", en: "/settings/supplements" },
    "/ayarlar/tercihler": { tr: "/ayarlar/tercihler", en: "/settings/preferences" },
    "/ayarlar/odeme": { tr: "/ayarlar/odeme", en: "/settings/billing" },
    "/ayarlar/verilerim": { tr: "/ayarlar/verilerim", en: "/settings/my-data" },

    // Auth flow
    "/giris": { tr: "/giris", en: "/login" },
    "/kayit": { tr: "/kayit", en: "/signup" },
    "/bekliyor": { tr: "/bekliyor", en: "/pending" },
    "/sifre-degistir": { tr: "/sifre-degistir", en: "/change-password" },
    "/sifremi-unuttum": { tr: "/sifremi-unuttum", en: "/forgot-password" },
    "/sifre-sifirla": { tr: "/sifre-sifirla", en: "/reset-password" },
    "/uyelik-doldu": { tr: "/uyelik-doldu", en: "/membership-expired" },
    "/deneme-bitti": { tr: "/deneme-bitti", en: "/trial-expired" },
    "/profil-tamamla": { tr: "/profil-tamamla", en: "/complete-profile" },

    // Sharing
    "/paylasilan": { tr: "/paylasilan", en: "/shared" },
    "/paylasilan/hafta/[weeklyPlanId]": {
      tr: "/paylasilan/hafta/[weeklyPlanId]",
      en: "/shared/week/[weeklyPlanId]",
    },
    "/paylasilan/gun/[dayId]": {
      tr: "/paylasilan/gun/[dayId]",
      en: "/shared/day/[dayId]",
    },

    // Admin
    "/admin": "/admin",
    "/admin/billing": "/admin/billing",
    "/admin/davet": { tr: "/admin/davet", en: "/admin/invite" },
    "/admin/ai-warnings": "/admin/ai-warnings",
    "/admin/geri-bildirim": { tr: "/admin/geri-bildirim", en: "/admin/feedback" },
    "/admin/kullanicilar": { tr: "/admin/kullanicilar", en: "/admin/users" },
    "/admin/kullanicilar/[userId]": {
      tr: "/admin/kullanicilar/[userId]",
      en: "/admin/users/[userId]",
    },
    "/admin/ai-kullanim": { tr: "/admin/ai-kullanim", en: "/admin/ai-usage" },

    // Billing / pricing
    "/fiyatlandirma": { tr: "/fiyatlandirma", en: "/pricing" },

    // Static / legal
    "/gizlilik": { tr: "/gizlilik", en: "/privacy" },
    "/kvkk": "/kvkk",
    "/kullanim-sartlari": { tr: "/kullanim-sartlari", en: "/terms" },
    "/tanitim": { tr: "/tanitim", en: "/about" },
    "/iade-politikasi": { tr: "/iade-politikasi", en: "/refund-policy" },
    "/cerez-politikasi": { tr: "/cerez-politikasi", en: "/cookie-policy" },
    "/iletisim": { tr: "/iletisim", en: "/contact" },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
