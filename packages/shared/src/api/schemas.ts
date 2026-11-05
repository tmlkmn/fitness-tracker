import { z } from "zod";

// Request schemas for the v1 mobile API. Pure zod, no server imports — these
// move to packages/shared (Phase 2) so the Expo app validates with the same
// rules before sending.

/** Positive integer id from a dynamic route segment (`[id]` → string). */
export const idParam = z.coerce.number().int().positive();

const decimalString = z
  .string()
  .regex(/^\d{1,4}(\.\d{1,2})?$/, "Expected a decimal like 12.5");

/** Body of create/update meal — mirrors `MealInput` in src/actions/meal-crud.ts. */
export const mealInputSchema = z.object({
  mealTime: z.string().min(1).max(20),
  // Canonical TR or any locale display label — coerceMealLabel() normalizes.
  mealLabel: z.string().min(1).max(50),
  content: z.string().min(1).max(5000),
  calories: z.number().int().min(0).max(10_000).nullable().optional(),
  proteinG: decimalString.nullable().optional(),
  carbsG: decimalString.nullable().optional(),
  fatG: decimalString.nullable().optional(),
  icon: z.string().max(16).nullable().optional(),
});

export type MealInputBody = z.infer<typeof mealInputSchema>;
