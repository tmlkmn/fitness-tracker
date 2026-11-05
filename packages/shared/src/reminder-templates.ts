export type ReminderTemplateKey =
  | "water"
  | "stretching"
  | "posture"
  | "supplement"
  | "sleep"
  | "steps";

const REMINDER_TEMPLATE_KEYS: readonly ReminderTemplateKey[] = [
  "water",
  "stretching",
  "posture",
  "supplement",
  "sleep",
  "steps",
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
];

export function isReminderTemplateKey(value: unknown): value is ReminderTemplateKey {
  return (
    typeof value === "string" &&
    (REMINDER_TEMPLATE_KEYS as readonly string[]).includes(value)
  );
}
