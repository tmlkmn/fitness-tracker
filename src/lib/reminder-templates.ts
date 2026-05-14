import type { Locale } from "@/lib/locale";
import { getServerTranslator } from "@/lib/i18n-server";

export type ReminderTemplateKey =
  | "water"
  | "stretching"
  | "posture"
  | "supplement"
  | "sleep"
  | "steps"
  | "readiness";

const REMINDER_TEMPLATE_KEYS: readonly ReminderTemplateKey[] = [
  "water",
  "stretching",
  "posture",
  "supplement",
  "sleep",
  "steps",
  "readiness",
];

export interface ReminderTemplate {
  key: ReminderTemplateKey;
  icon: string;
  defaultTime: string | null;
  defaultRecurrence: "daily" | "weekdays" | "interval";
  defaultIntervalMinutes?: number;
  defaultIntervalStart?: string;
  defaultIntervalEnd?: string;
}

export const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    key: "water",
    icon: "Droplets",
    defaultTime: null,
    defaultRecurrence: "interval",
    defaultIntervalMinutes: 60,
    defaultIntervalStart: "09:00",
    defaultIntervalEnd: "23:00",
  },
  {
    key: "stretching",
    icon: "StretchHorizontal",
    defaultTime: null,
    defaultRecurrence: "interval",
    defaultIntervalMinutes: 60,
    defaultIntervalStart: "09:00",
    defaultIntervalEnd: "23:00",
  },
  {
    key: "posture",
    icon: "PersonStanding",
    defaultTime: null,
    defaultRecurrence: "interval",
    defaultIntervalMinutes: 120,
    defaultIntervalStart: "09:00",
    defaultIntervalEnd: "23:00",
  },
  {
    key: "supplement",
    icon: "Pill",
    defaultTime: "09:00",
    defaultRecurrence: "daily",
  },
  {
    key: "sleep",
    icon: "Moon",
    defaultTime: "23:30",
    defaultRecurrence: "daily",
  },
  {
    key: "steps",
    icon: "Footprints",
    defaultTime: null,
    defaultRecurrence: "interval",
    defaultIntervalMinutes: 180,
    defaultIntervalStart: "09:00",
    defaultIntervalEnd: "23:00",
  },
  {
    key: "readiness",
    icon: "Activity",
    defaultTime: "20:00",
    defaultRecurrence: "daily",
  },
];

export function isReminderTemplateKey(value: unknown): value is ReminderTemplateKey {
  return (
    typeof value === "string" &&
    (REMINDER_TEMPLATE_KEYS as readonly string[]).includes(value)
  );
}

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
