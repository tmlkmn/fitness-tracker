export const ROUTINE_EVENTS = [
  { value: "Uyanış", label: "Uyanış" },
  { value: "Kahvaltı", label: "Kahvaltı" },
  { value: "İşe Gidiş", label: "İşe Gidiş" },
  { value: "Öğle Yemeği", label: "Öğle Yemeği" },
  { value: "Ara Öğün", label: "Ara Öğün" },
  { value: "İşten Çıkış", label: "İşten Çıkış" },
  { value: "Akşam Yemeği", label: "Akşam Yemeği" },
  { value: "Antrenman", label: "Antrenman" },
  { value: "Uyku", label: "Uyku" },
] as const;

export type RoutineEventValue = (typeof ROUTINE_EVENTS)[number]["value"];

export const MEAL_EVENTS: readonly string[] = ["Kahvaltı", "Öğle Yemeği", "Akşam Yemeği"];

// Events the user may add more than once (e.g. several snacks at different
// times). Everything else stays unique per routine so a wake/sleep can't be
// picked twice. Consumed by the routine editor's duplicate-disable logic.
export const REPEATABLE_EVENTS: ReadonlySet<string> = new Set(["Ara Öğün"]);

export function isRepeatableEvent(value: string): boolean {
  return REPEATABLE_EVENTS.has(value);
}

const NORMALIZATION: Record<string, string> = {
  "Öğle yemeği": "Öğle Yemeği",
  "Akşam yemeği": "Akşam Yemeği",
  "İşe gidiş": "İşe Gidiş",
  "İşten çıkış": "İşten Çıkış",
  "Uyanma": "Uyanış",
  "Yatma": "Uyku",
};

export function normalizeEvent(event: string): string {
  return NORMALIZATION[event] ?? event;
}
