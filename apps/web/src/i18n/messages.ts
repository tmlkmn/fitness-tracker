import type { Locale } from "@fitmusc/shared/locale";

// Message catalogs live in @fitmusc/shared so the mobile app uses the same
// keys. Static specifiers per locale — the bundler can't expand a template
// literal into a workspace package.
const loaders = {
  tr: () => import("@fitmusc/shared/messages/tr.json"),
  en: () => import("@fitmusc/shared/messages/en.json"),
} satisfies Record<Locale, () => Promise<{ default: unknown }>>;

export async function importMessages(locale: Locale) {
  return (await loaders[locale]()).default;
}
