export type WeekStart = "monday" | "sunday";

const LABELS_MONDAY = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const LABELS_SUNDAY = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function getWeekDayLabels(startsOn: WeekStart = "monday"): string[] {
  return startsOn === "sunday" ? LABELS_SUNDAY : LABELS_MONDAY;
}

export function getWeekStartDate(date: Date, startsOn: WeekStart = "monday"): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff =
    startsOn === "sunday"
      ? -day
      : day === 0
        ? -6
        : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
