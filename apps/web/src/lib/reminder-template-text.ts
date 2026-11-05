import type { Locale } from "@fitmusc/shared/locale";
import type { ReminderTemplateKey } from "@fitmusc/shared/reminder-templates";
import { getServerTranslator } from "@/lib/i18n-server";

/**
 * Server-only: read template title/body from i18n. Client components should
 * call `useTranslations("reminderTemplates")` and read `${key}.title` /
 * `${key}.body` directly — that avoids an async hop in render.
 */
export async function getReminderTemplateText(
  key: ReminderTemplateKey,
  locale: Locale,
): Promise<{ title: string; body: string }> {
  const t = await getServerTranslator(locale, "reminderTemplates");
  return { title: t(`${key}.title`), body: t(`${key}.body`) };
}
