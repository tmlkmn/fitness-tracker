import { createTranslator } from "next-intl";
import type { Locale } from "@/lib/locale";

type MessageRecord = Record<string, unknown>;

const messagesCache: Partial<Record<Locale, MessageRecord>> = {};

async function loadMessages(locale: Locale): Promise<MessageRecord> {
  let cached = messagesCache[locale];
  if (!cached) {
    cached = (await import(`../../messages/${locale}.json`)).default as MessageRecord;
    messagesCache[locale] = cached;
  }
  return cached;
}

export type ServerTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/**
 * Context-free translator for server contexts that run outside a Next.js
 * request lifecycle — cron jobs, transactional emails, push dispatch.
 * Pass `locale` explicitly; `getTranslations` from `next-intl/server`
 * requires a request context which these dispatch paths don't have.
 *
 * Return is intentionally a loose function type — callers reference keys
 * that next-intl's strict `IntlMessages` global doesn't know about (project
 * has no augmentation), and the runtime tolerates missing keys with a
 * stable fallback. Keep TR/EN parity via scripts/check-i18n-keys.cjs.
 */
export async function getServerTranslator(
  locale: Locale,
  namespace: string,
): Promise<ServerTranslator> {
  const messages = await loadMessages(locale);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createTranslator({ locale, namespace, messages }) as any;
}
