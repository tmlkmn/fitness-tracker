// Response shapes of the v1 API as the client receives them, i.e. after JSON
// serialization: timestamps arrive as ISO strings, Postgres numerics as
// decimal strings. The web routes check their action results against these
// at compile time (`JsonSource` in apps/web/src/lib/api/handler.ts).

/** Decimal string from a Postgres numeric column, e.g. "12.50". */
export type DecimalString = string;

/** ISO-8601 timestamp, e.g. "2026-11-05T18:54:25.259Z". */
export type IsoDateTime = string;

/** GET /api/v1/days/[dayId]/meals (array, ordered by mealTime). */
export interface MealDto {
  id: number;
  dailyPlanId: number | null;
  mealTime: string;
  /** Canonical TR label — display through `getLocalizedMealLabel()`. */
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: DecimalString | null;
  carbsG: DecimalString | null;
  fatG: DecimalString | null;
  /** Emoji override; null → fall back to the label-based icon. */
  icon: string | null;
  isCompleted: boolean | null;
  sortOrder: number;
}

/** GET /api/v1/me/profile */
export interface UserProfileDto {
  weight: DecimalString | null;
  targetWeight: DecimalString | null;
  height: number | null;
  age: number | null;
  healthNotes: string | null;
  /** JSON-encoded string array, e.g. `["Yok"]`. */
  foodAllergens: string | null;
  dailyRoutine: unknown;
  weekendRoutine: unknown;
  supplementSchedule: unknown;
  fitnessLevel: string | null;
  fitnessGoal: string | null;
  sportHistory: string | null;
  currentMedications: string | null;
  serviceType: string | null;
  membershipType: string | null;
  membershipStartDate: IsoDateTime | null;
  membershipEndDate: IsoDateTime | null;
  hasSeenOnboarding: boolean | null;
  targetCalories: number | null;
  targetProteinG: DecimalString | null;
  targetCarbsG: DecimalString | null;
  targetFatG: DecimalString | null;
  targetCalorieDelta: number | null;
  targetProteinPerKg: DecimalString | null;
  targetFatPct: DecimalString | null;
  weightUnit: string | null;
  energyUnit: string | null;
  gender: string | null;
  dailyActivityLevel: string | null;
  hasEatingDisorderHistory: boolean | null;
  isPregnantOrBreastfeeding: boolean | null;
  hasDiabetes: boolean | null;
  hasThyroidCondition: boolean | null;
}
