export interface ReminderTemplate {
  key: string;
  title: string;
  body: string;
  icon: string;
  defaultTime: string;
  defaultRecurrence: "daily" | "weekdays";
}

export const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    key: "water",
    title: "Su İç",
    body: "Bir bardak su içmeyi unutma!",
    icon: "Droplets",
    defaultTime: "10:00",
    defaultRecurrence: "daily",
  },
  {
    key: "stretching",
    title: "Esneme Yap",
    body: "Kısa bir esneme molası ver, kaslarını gevşet.",
    icon: "StretchHorizontal",
    defaultTime: "15:00",
    defaultRecurrence: "weekdays",
  },
  {
    key: "posture",
    title: "Duruş Kontrolü",
    body: "Oturuşunu kontrol et, sırtını düzelt.",
    icon: "PersonStanding",
    defaultTime: "12:00",
    defaultRecurrence: "weekdays",
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
    defaultTime: "14:00",
    defaultRecurrence: "weekdays",
  },
];
