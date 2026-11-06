import en from "@fitmusc/shared/messages/en.json";
import tr from "@fitmusc/shared/messages/tr.json";
import { normalizeLocale, type Locale } from "@fitmusc/shared/locale";
import { getLocales } from "expo-localization";
import type { ReactNode } from "react";
import { IntlProvider, type AbstractIntlMessages } from "use-intl";

// The web app's catalogs (packages/shared/messages) — same keys on both
// clients; app-only strings live under the `mobile` namespace. A few entries
// are arrays (read with t.raw), which AbstractIntlMessages doesn't model.
const MESSAGES = { tr, en } as unknown as Record<Locale, AbstractIntlMessages>;

/** Before sign-in there is no user locale yet: follow the device. */
export function deviceLocale(): Locale {
  return getLocales()[0]?.languageCode === "en" ? "en" : "tr";
}

export function I18nProvider({ locale, children }: { locale: string | null | undefined; children: ReactNode }) {
  const active = locale ? normalizeLocale(locale) : deviceLocale();
  return (
    <IntlProvider
      locale={active}
      messages={MESSAGES[active]}
      // Plan days are calendar dates in the program's zone (the server uses it too).
      timeZone="Europe/Istanbul"
      onError={(error) => {
        if (__DEV__) console.warn(`[i18n] ${error.message}`);
      }}
      getMessageFallback={({ namespace, key }) => (namespace ? `${namespace}.${key}` : key)}
    >
      {children}
    </IntlProvider>
  );
}
