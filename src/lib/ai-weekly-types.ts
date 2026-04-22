export interface AIMealItem {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

export interface AIExerciseItem {
  section: string;
  sectionLabel: string;
  name: string;
  englishName: string | null;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

export interface AIWeeklyDay {
  dayOfWeek: number;
  dayName: string;
  planType: string;
  workoutTitle: string | null;
  meals: AIMealItem[];
  exercises: AIExerciseItem[];
}

export interface AIWeeklyPlan {
  weekTitle: string;
  phase: string;
  notes: string | null;
  days: AIWeeklyDay[];
}

const TURKISH_DAY_NAMES_MAP: Record<string, number> = {
  pazartesi: 0,
  salı: 1,
  "salÄ±": 1,
  çarşamba: 2,
  "Ã§arÅŸamba": 2,
  perşembe: 3,
  "perÅŸembe": 3,
  cuma: 4,
  cumartesi: 5,
  pazar: 6,
};

function resolveDayOfWeek(dayName: string, aiDayOfWeek: number, index: number): number {
  const normalized = dayName.toLowerCase().trim();
  if (normalized in TURKISH_DAY_NAMES_MAP) {
    return TURKISH_DAY_NAMES_MAP[normalized];
  }
  if (aiDayOfWeek >= 0 && aiDayOfWeek <= 6) return aiDayOfWeek;
  return index;
}

export function validateWeeklyPlan(data: unknown): AIWeeklyPlan {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.days)) {
    throw new Error("Invalid response format: expected { weekTitle, days: [...] }");
  }

  return {
    weekTitle: String(obj.weekTitle ?? "Haftalık Plan"),
    phase: String(obj.phase ?? "custom"),
    notes: obj.notes != null ? String(obj.notes) : null,
    days: (obj.days as Record<string, unknown>[]).map((day, index) => ({
      dayOfWeek: resolveDayOfWeek(String(day.dayName ?? ""), Number(day.dayOfWeek ?? index), index),
      dayName: String(day.dayName ?? ""),
      planType: String(day.planType ?? "workout"),
      workoutTitle: day.workoutTitle != null ? String(day.workoutTitle) : null,
      meals: Array.isArray(day.meals)
        ? (day.meals as Record<string, unknown>[]).map((m) => ({
            mealTime: String(m.mealTime ?? "08:00"),
            mealLabel: String(m.mealLabel ?? "Öğün"),
            content: String(m.content ?? ""),
            calories: m.calories != null ? Number(m.calories) : null,
            proteinG: m.proteinG != null ? String(m.proteinG) : null,
            carbsG: m.carbsG != null ? String(m.carbsG) : null,
            fatG: m.fatG != null ? String(m.fatG) : null,
          }))
        : [],
      exercises: Array.isArray(day.exercises)
        ? (day.exercises as Record<string, unknown>[]).map((ex) => ({
            section: String(ex.section ?? "main"),
            sectionLabel: String(ex.sectionLabel ?? "Ana Antrenman"),
            name: String(ex.name ?? ""),
            englishName: ex.englishName != null && String(ex.englishName).trim() !== "" ? String(ex.englishName) : null,
            sets: ex.sets != null ? Number(ex.sets) : null,
            reps: ex.reps != null ? String(ex.reps) : null,
            restSeconds: ex.restSeconds != null ? Number(ex.restSeconds) : null,
            durationMinutes: ex.durationMinutes != null ? Number(ex.durationMinutes) : null,
            notes: ex.notes != null ? String(ex.notes) : null,
          }))
        : [],
    })),
  };
}
