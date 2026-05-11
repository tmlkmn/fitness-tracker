"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { isLocale, type Locale } from "@/lib/locale";

// Keeps the URL locale in sync with the authoritative DB locale stored on the
// user record. Without this, a PWA whose start_url was baked at install time
// (e.g. iPhone home-screen shortcut pointing at /en/...) stays in that locale
// even after the user toggles language on another device, because next-intl
// treats the URL prefix as the source of truth for UI rendering.
//
// On every page load, if the authenticated user's users.locale differs from
// the URL locale, we router.replace to the localized equivalent of the current
// pathname. This is client-side so there is a brief flash before redirect on
// cold loads — acceptable for the rare cross-device locale-drift case, and we
// avoid pulling DB access into edge middleware.
export function LocaleSync() {
  const { data: session, isPending } = useSession();
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (isPending || !session?.user || hasRedirectedRef.current) return;

    const dbLocale = (session.user as { locale?: string | null }).locale;
    if (!isLocale(dbLocale) || dbLocale === currentLocale) return;

    hasRedirectedRef.current = true;
    router.replace(pathname, { locale: dbLocale });
  }, [session, isPending, currentLocale, pathname, router]);

  return null;
}
