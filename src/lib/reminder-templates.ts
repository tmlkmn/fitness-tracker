import type { Locale } from "@/lib/locale";

export type ReminderTemplateKey =
  | "water"
  | "stretching"
  | "posture"
  | "supplement"
  | "sleep"
  | "steps";

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
];

const REMINDER_TEMPLATE_TEXT: Record<
  ReminderTemplateKey,
  Record<Locale, { title: string; body: string }>
> = {
  water: {
    tr: { title: "Su İç", body: "Bir bardak su içmeyi unutma!" },
    en: { title: "Drink Water", body: "Don't forget to drink a glass of water!" },
  },
  stretching: {
    tr: { title: "Esneme Yap", body: "Kısa bir esneme molası ver, kaslarını gevşet." },
    en: { title: "Stretch", body: "Take a short stretching break and relax your muscles." },
  },
  posture: {
    tr: { title: "Duruş Kontrolü", body: "Oturuşunu kontrol et, sırtını düzelt." },
    en: { title: "Posture Check", body: "Check your posture and straighten your back." },
  },
  supplement: {
    tr: { title: "Supplement Zamanı", body: "Günlük supplementlerini almayı unutma." },
    en: { title: "Supplement Time", body: "Don't forget your daily supplements." },
  },
  sleep: {
    tr: { title: "Uyku Hazırlığı", body: "Yatmadan 30 dk önce ekranları kapat." },
    en: { title: "Sleep Prep", body: "Turn off screens 30 minutes before bed." },
  },
  steps: {
    tr: { title: "Yürüyüş Molası", body: "Kalk ve biraz yürü, 10 dk hareket et." },
    en: { title: "Walk Break", body: "Get up and walk for 10 minutes." },
  },
};

export function isReminderTemplateKey(value: unknown): value is ReminderTemplateKey {
  return typeof value === "string" && value in REMINDER_TEMPLATE_TEXT;
}

export function getReminderTemplateText(
  key: ReminderTemplateKey,
  locale: Locale,
): { title: string; body: string } {
  return REMINDER_TEMPLATE_TEXT[key][locale];
}
