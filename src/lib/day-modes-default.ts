/**
 * Single source of truth for the default 7-day workout/rest split based on
 * the user's fitness level. Both the weekly-plan modal (UI default) and the
 * AI weekly service (backend fallback) consume this so the two stay in sync.
 */
import type { DayModeChoice } from "@/lib/ai-weekly-types";

export type DayMode = DayModeChoice;
export type DayModesMap = Partial<Record<number, DayMode>>;

/**
 * Pick the default workout/rest split based on the user's fitness level.
 *
 * - beginner     → 3 workout days (Mon / Wed / Fri)
 * - intermediate → 4 workout days (Mon / Tue / Thu / Fri, upper/lower style)
 * - advanced/unknown → 5 workout days (Mon–Fri)
 *
 * Indices follow JS getDay() with Monday remapped to 0 in the app's calendar
 * (0 = Mon … 6 = Sun) — matches the rest of `ai-weekly-service.ts`.
 */
export function defaultDayModesForLevel(
  fitnessLevel: string | null | undefined,
): DayModesMap {
  if (fitnessLevel === "beginner") {
    return {
      0: "workout",
      1: "rest",
      2: "workout",
      3: "rest",
      4: "workout",
      5: "rest",
      6: "rest",
    };
  }
  if (fitnessLevel === "intermediate") {
    return {
      0: "workout",
      1: "workout",
      2: "rest",
      3: "workout",
      4: "workout",
      5: "rest",
      6: "rest",
    };
  }
  // advanced or null/unknown — legacy 5-day split
  return {
    0: "workout",
    1: "workout",
    2: "workout",
    3: "workout",
    4: "workout",
    5: "rest",
    6: "rest",
  };
}

/**
 * UI-side helper: same shape as the backend default but typed as the modal's
 * narrower `"workout" | "swimming" | "rest"` (no `"nutrition"`), with full
 * 7-day coverage so React state never has `undefined` slots.
 */
export function defaultUiDayModesForLevel(
  fitnessLevel: string | null | undefined,
): Record<number, "workout" | "swimming" | "rest"> {
  const base = defaultDayModesForLevel(fitnessLevel);
  const out: Record<number, "workout" | "swimming" | "rest"> = {
    0: "rest",
    1: "rest",
    2: "rest",
    3: "rest",
    4: "rest",
    5: "rest",
    6: "rest",
  };
  for (let i = 0; i < 7; i++) {
    const v = base[i];
    if (v === "workout" || v === "swimming") out[i] = v;
  }
  return out;
}
