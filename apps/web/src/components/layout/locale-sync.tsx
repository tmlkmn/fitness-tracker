"use client";

import { useEffect } from "react";
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
// The reconciliation must run at most ONCE per full page load. We gate it with
// a module-level flag rather than a component ref so it survives remounts and,
// crucially, the client-side navigation that a language toggle performs: right
// after a toggle the in-memory session still reports the previous locale, so if
// LocaleSync re-evaluated it would bounce the URL straight back to the old
// language. A real page reload resets the module, so cross-device drift is
// still reconciled on the next cold load.
let reconciled = false;

export function LocaleSync() {
  const { data: session, isPending } = useSession();
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPending || !session?.user || reconciled) return;

    // First resolved session this page load — decide once, then stay dormant.
    reconciled = true;

    const dbLocale = (session.user as { locale?: string | null }).locale;
    if (!isLocale(dbLocale) || dbLocale === currentLocale) return;

    router.replace(pathname, { locale: dbLocale });
  }, [session, isPending, currentLocale, pathname, router]);

  return null;
}
