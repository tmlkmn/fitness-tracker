export const ROUTINE_EVENTS = [
  { value: "Uyanış", label: "Uyanış" },
  { value: "Kahvaltı", label: "Kahvaltı" },
  { value: "İşe Gidiş", label: "İşe Gidiş" },
  { value: "Öğle Yemeği", label: "Öğle Yemeği" },
  { value: "İşten Çıkış", label: "İşten Çıkış" },
  { value: "Akşam Yemeği", label: "Akşam Yemeği" },
  { value: "Antrenman", label: "Antrenman" },
  { value: "Uyku", label: "Uyku" },
] as const;

export type RoutineEventValue = (typeof ROUTINE_EVENTS)[number]["value"];

export const MEAL_EVENTS: readonly string[] = ["Kahvaltı", "Öğle Yemeği", "Akşam Yemeği"];

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
