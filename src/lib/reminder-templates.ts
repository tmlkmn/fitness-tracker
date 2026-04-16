export interface ReminderTemplate {
  key: string;
  title: string;
  body: string;
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
    title: "Su İç",
    body: "Bir bardak su içmeyi unutma!",
    icon: "Droplets",
    defaultTime: null,
    defaultRecurrence: "interval",
    defaultIntervalMinutes: 60,
    defaultIntervalStart: "09:00",
    defaultIntervalEnd: "23:00",
  },
  {
    key: "stretching",
    title: "Esneme Yap",
    body: "Kısa bir esneme molası ver, kaslarını gevşet.",
    icon: "StretchHorizontal",
    defaultTime: null,
    defaultRecurrence: "interval",
    defaultIntervalMinutes: 60,
    defaultIntervalStart: "09:00",
    defaultIntervalEnd: "23:00",
  },
  {
    key: "posture",
    title: "Duruş Kontrolü",
    body: "Oturuşunu kontrol et, sırtını düzelt.",
    icon: "PersonStanding",
    defaultTime: null,
    defaultRecurrence: "interval",
    defaultIntervalMinutes: 120,
    defaultIntervalStart: "09:00",
    defaultIntervalEnd: "23:00",
  },
  {
    key: "supplement",
    title: "Supplement Zamanı",
    body: "Günlük supplementlerini almayı unutma.",
    icon: "Pill",
    defaultTime: "09:00",
    defaultRecurrence: "daily",
  },
  {
    key: "sleep",
    title: "Uyku Hazırlığı",
    body: "Yatmadan 30 dk önce ekranları kapat.",
    icon: "Moon",
    defaultTime: "23:30",
    defaultRecurrence: "daily",
  },
  {
    key: "steps",
    title: "Yürüyüş Molası",
    body: "Kalk ve biraz yürü, 10 dk hareket et.",
    icon: "Footprints",
    defaultTime: null,
    defaultRecurrence: "interval",
    defaultIntervalMinutes: 180,
    defaultIntervalStart: "09:00",
    defaultIntervalEnd: "23:00",
  },
];
