import { z } from "zod";
import { isReminderTemplateKey } from "../reminder-templates";
import { SUPPORTED_LOCALES } from "../locale";

// Request schemas of the v1 API. The web routes validate with them and the
// Expo app runs the same rules before sending. Objects strip unknown keys, so
// a body can never smuggle extra columns (userId, …) into an action.

// ── Primitives ──────────────────────────────────────────────────────────────

/** Positive integer id from a dynamic route segment (`[id]` → string). */
export const idParam = z.coerce.number().int().positive();

/** Calendar date `YYYY-MM-DD` that actually exists (no 2026-02-30). */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, "Not a calendar date");

/** 24-hour clock time `HH:MM`. */
export const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");

/** Value for a Postgres numeric column, sent as a string (e.g. "12.5"). */
export const decimalString = z
  .string()
  .regex(/^\d{1,4}(\.\d{1,2})?$/, "Expected a decimal like 12.5");

const text = (max: number) => z.string().trim().min(1).max(max);
const nullableDecimal = decimalString.nullable().optional();

/** PATCH bodies: an empty object would be a no-op write (and drizzle rejects it). */
const atLeastOneField = (body: object) => Object.values(body).some((v) => v !== undefined);

export const PLAN_TYPES = ["workout", "swimming", "rest", "nutrition"] as const;
export const EXERCISE_SECTIONS = ["warmup", "main", "cooldown", "sauna", "swimming"] as const;
export const FOOD_CATEGORIES = ["protein", "karbonhidrat", "yag", "sebze_meyve", "sut_urunleri"] as const;
export const FITNESS_LEVELS = ["beginner", "returning", "intermediate", "advanced"] as const;
export const FITNESS_GOALS = ["loss", "recomp", "maintain", "muscle_gain", "weight_gain"] as const;
export const SERVICE_TYPES = ["full", "nutrition"] as const;
export const GENDERS = ["male", "female", "prefer_not_to_say"] as const;
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "very_active"] as const;
export const REMINDER_TYPES = ["custom", "meal", "workout"] as const;
export const REMINDER_RECURRENCES = ["daily", "weekdays", "weekends", "once", "custom", "interval"] as const;
export const FEEDBACK_CATEGORIES = ["suggestion", "complaint", "bug", "general"] as const;

/** `{ isCompleted }` — meal / exercise completion toggles. */
export const completionSchema = z.object({ isCompleted: z.boolean() });

/** Query `?limit=` for "latest N" lists. */
export const limitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const dateQuery = z.object({ date: dateString });

const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000;

export const dateRangeQuery = z
  .object({ start: dateString, end: dateString })
  .refine((r) => r.start <= r.end, "start must not be after end")
  .refine((r) => daysBetween(r.start, r.end) <= 366, "Range is longer than a year");

// ── Plans / calendar ────────────────────────────────────────────────────────

export const monthQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const emptyWeeksBetweenQuery = z
  .object({ today: dateString, target: dateString })
  .refine((r) => Math.abs(daysBetween(r.today, r.target)) <= 1100, "Range is longer than 3 years");

/** POST /days — returns the day's id, creating the plan rows if needed. */
export const ensureDaySchema = z.object({ date: dateString });

/** POST /days/[dayId]/move — the path's day is the source. */
export const moveDayContentsSchema = z.object({
  targetDailyPlanId: z.number().int().positive(),
  mode: z.enum(["move", "swap", "replace"]),
  includeWorkout: z.boolean(),
  includeMeals: z.boolean(),
});

// ── Meals ───────────────────────────────────────────────────────────────────

/** Body of create/update meal — mirrors `MealInput` in src/actions/meal-crud.ts. */
export const mealInputSchema = z.object({
  mealTime: z.string().min(1).max(20),
  // Canonical TR or any locale display label — coerceMealLabel() normalizes.
  mealLabel: z.string().min(1).max(50),
  content: z.string().min(1).max(5000),
  calories: z.number().int().min(0).max(10_000).nullable().optional(),
  proteinG: nullableDecimal,
  carbsG: nullableDecimal,
  fatG: nullableDecimal,
  icon: z.string().max(16).nullable().optional(),
});

export type MealInputBody = z.infer<typeof mealInputSchema>;

export const bulkMealsSchema = z.object({ items: z.array(mealInputSchema).min(1).max(30) });

export const recentMealsQuery = z.object({
  label: z.string().min(1).max(50),
  excludeDayId: idParam,
});

export const mealPickerQuery = z.object({
  q: z.string().max(100).optional(),
  excludeDayId: idParam.optional(),
});

/** `?ids=1,2,3` → number[] */
export const mealIdsQuery = z.object({
  ids: z
    .string()
    .regex(/^\d+(,\d+){0,99}$/, "Expected comma-separated ids")
    .transform((value) => value.split(",").map(Number)),
});

export const savedMealsQuery = z.object({ label: z.string().min(1).max(50).optional() });

export const savedMealSchema = z.object({
  mealLabel: z.string().min(1).max(50),
  content: z.string().min(1).max(5000),
  calories: z.number().int().min(0).max(10_000).nullable().default(null),
  proteinG: decimalString.nullable().default(null),
  carbsG: decimalString.nullable().default(null),
  fatG: decimalString.nullable().default(null),
});

export const userFoodSchema = z.object({
  name: text(100),
  portion: text(50),
  calories: z.number().int().min(0).max(5000),
  proteinG: nullableDecimal,
  carbsG: nullableDecimal,
  fatG: nullableDecimal,
  category: z.enum(FOOD_CATEGORIES).nullable().optional(),
});

export const purchasedSchema = z.object({ isPurchased: z.boolean() });

// ── Exercises ───────────────────────────────────────────────────────────────

/** Body of create/update exercise — mirrors `ExerciseInput` in src/actions/exercise-crud.ts. */
export const exerciseInputSchema = z.object({
  section: z.enum(EXERCISE_SECTIONS),
  sectionLabel: z.string().min(1).max(50),
  name: z.string().min(1).max(120),
  sets: z.number().int().min(0).max(100).nullable().optional(),
  reps: z.string().max(30).nullable().optional(),
  restSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  durationMinutes: z.number().int().min(0).max(600).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type ExerciseInputBody = z.infer<typeof exerciseInputSchema>;

export const bulkExercisesSchema = z.object({ items: z.array(exerciseInputSchema).min(1).max(50) });

export const searchTextQuery = z.object({ q: z.string().trim().min(1).max(100) });

export const exerciseDemoQuery = z.object({ name: z.string().trim().min(1).max(120) });

// ── Wellness ────────────────────────────────────────────────────────────────

const PROGRESS_MEASUREMENTS = [
  "weight", "fluidPercent", "fluidKg", "fatPercent", "fatKg", "bmi",
  "leftArmFatPercent", "leftArmFatKg", "leftArmMusclePercent", "leftArmMuscleKg",
  "rightArmFatPercent", "rightArmFatKg", "rightArmMusclePercent", "rightArmMuscleKg",
  "torsoFatPercent", "torsoFatKg", "torsoMusclePercent", "torsoMuscleKg",
  "leftLegFatPercent", "leftLegFatKg", "leftLegMusclePercent", "leftLegMuscleKg",
  "rightLegFatPercent", "rightLegFatKg", "rightLegMusclePercent", "rightLegMuscleKg",
  "waistCm", "rightArmCm", "leftArmCm", "rightLegCm", "leftLegCm",
] as const;

/**
 * Body of add (POST) / update (PATCH) progress log — every measurement is
 * optional; on update an omitted one keeps its stored value.
 */
export const progressLogSchema = z.object({
  logDate: dateString,
  ...(Object.fromEntries(PROGRESS_MEASUREMENTS.map((key) => [key, decimalString.optional()])) as {
    [K in (typeof PROGRESS_MEASUREMENTS)[number]]: z.ZodOptional<typeof decimalString>;
  }),
  notes: z.string().max(1000).optional(),
});

const rating = z.number().int().min(1).max(5);

export const readinessLogSchema = z.object({
  logDate: dateString.optional(),
  energyRating: rating.nullable(),
  painScore: rating.nullable(),
  notes: z.string().max(200).nullable().optional(),
});

export const sleepLogSchema = z.object({
  logDate: dateString,
  bedtime: timeString,
  wakeTime: timeString,
  quality: rating.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const waterIncrementSchema = z.object({
  delta: z.number().int().min(-20).max(20).refine((n) => n !== 0, "delta must not be 0"),
});

export const supplementCompletionSchema = z.object({ completed: z.boolean() });

export const macroTargetsForDayQuery = z.object({ planType: z.enum(PLAN_TYPES).optional() });

// ── Profile / settings ──────────────────────────────────────────────────────

const routineItems = z
  .array(z.object({ time: timeString, event: z.string().min(1).max(100) }))
  .max(30);

export const unitPreferencesSchema = z.object({
  weightUnit: z.enum(["kg", "lb"]),
  energyUnit: z.enum(["kcal", "kj"]),
});

/** All-null = pure goal default. `fatPct` is a fraction (0.25 = 25%). */
export const macroStrategySchema = z.object({
  calorieDelta: z.number().int().min(-2000).max(2000).nullable(),
  proteinPerKg: z.number().min(0.5).max(5).nullable(),
  fatPct: z.number().min(0.05).max(0.8).nullable(),
});

export const healthProfileSchema = z.object({
  gender: z.enum(GENDERS),
  dailyActivityLevel: z.enum(ACTIVITY_LEVELS),
  hasEatingDisorderHistory: z.boolean(),
  isPregnantOrBreastfeeding: z.boolean(),
  hasDiabetes: z.boolean(),
  hasThyroidCondition: z.boolean(),
});

/** PUT semantics: an omitted field is cleared. */
export const weightTargetsSchema = z.object({
  weight: decimalString.optional(),
  targetWeight: decimalString.optional(),
});

const profileFields = {
  age: z.number().int().min(10).max(120),
  healthNotes: z.string().max(2000),
  /** JSON-encoded string array, e.g. `["Yok"]`. */
  foodAllergens: z.string().max(1000),
  fitnessLevel: z.enum(FITNESS_LEVELS),
  fitnessGoal: z.enum(FITNESS_GOALS),
  sportHistory: z.string().max(2000),
  currentMedications: z.string().max(2000),
  serviceType: z.enum(SERVICE_TYPES),
};

export const onboardingSchema = z.object({
  height: z.number().int().min(50).max(300),
  weight: decimalString,
  targetWeight: decimalString,
  age: profileFields.age.optional(),
  healthNotes: profileFields.healthNotes.optional(),
  foodAllergens: profileFields.foodAllergens.optional(),
  dailyRoutine: routineItems.optional(),
  weekendRoutine: routineItems.optional(),
  fitnessLevel: profileFields.fitnessLevel.optional(),
  fitnessGoal: profileFields.fitnessGoal.optional(),
  sportHistory: profileFields.sportHistory.optional(),
  currentMedications: profileFields.currentMedications.optional(),
  serviceType: profileFields.serviceType.optional(),
  gender: z.enum(GENDERS).optional(),
  dailyActivityLevel: z.enum(ACTIVITY_LEVELS).optional(),
  hasEatingDisorderHistory: z.boolean().optional(),
  isPregnantOrBreastfeeding: z.boolean().optional(),
  hasDiabetes: z.boolean().optional(),
  hasThyroidCondition: z.boolean().optional(),
});

/** PATCH /me/profile — only the fields sent are changed. */
export const profileUpdateSchema = z.object({
  height: z.number().int().min(50).max(300).optional(),
  weight: decimalString.optional(),
  targetWeight: decimalString.optional(),
  age: profileFields.age.nullable().optional(),
  healthNotes: profileFields.healthNotes.optional(),
  foodAllergens: profileFields.foodAllergens.optional(),
  fitnessLevel: profileFields.fitnessLevel.optional(),
  fitnessGoal: profileFields.fitnessGoal.optional(),
  sportHistory: profileFields.sportHistory.optional(),
  currentMedications: profileFields.currentMedications.optional(),
  serviceType: profileFields.serviceType.optional(),
}).refine(atLeastOneField, "Send at least one field");

export const routineSchema = z.object({ items: routineItems });

export const supplementScheduleSchema = z.object({
  items: z
    .array(z.object({ period: z.string().min(1).max(50), supplements: z.string().max(500) }))
    .max(20),
});

export const localeSchema = z.object({ locale: z.enum(SUPPORTED_LOCALES) });

export const notificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  defaultWorkoutTime: timeString.optional(),
  /** IANA zone name, e.g. "Europe/Istanbul". */
  timezone: z
    .string()
    .regex(/^(UTC|[A-Za-z]+(\/[A-Za-z0-9_+-]+){1,2})$/, "Expected an IANA time zone")
    .optional(),
  quietHoursStart: timeString.nullable().optional(),
  quietHoursEnd: timeString.nullable().optional(),
  weekStartsOn: z.enum(["monday", "sunday"]).optional(),
}).refine(atLeastOneField, "Send at least one field");

export const deleteAccountSchema = z.object({ confirmEmail: z.string().trim().min(3).max(254) });

// ── Reminders ───────────────────────────────────────────────────────────────

const reminderFields = {
  title: text(100),
  body: z.string().max(500),
  time: timeString,
  minutesBefore: z.number().int().min(0).max(240),
  recurrence: z.enum(REMINDER_RECURRENCES),
  intervalMinutes: z.number().int().min(5).max(720),
  intervalStart: timeString,
  intervalEnd: timeString,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7),
  onceDate: dateString,
  skipEmail: z.boolean(),
};

const reminderTemplateKey = z.string().refine(isReminderTemplateKey, "Unknown template key");

export const reminderCreateSchema = z.object({
  type: z.enum(REMINDER_TYPES),
  title: reminderFields.title,
  body: reminderFields.body.optional(),
  templateKey: reminderTemplateKey.optional(),
  time: reminderFields.time.optional(),
  minutesBefore: reminderFields.minutesBefore.optional(),
  recurrence: reminderFields.recurrence,
  intervalMinutes: reminderFields.intervalMinutes.optional(),
  intervalStart: reminderFields.intervalStart.optional(),
  intervalEnd: reminderFields.intervalEnd.optional(),
  daysOfWeek: reminderFields.daysOfWeek.optional(),
  onceDate: reminderFields.onceDate.optional(),
  skipEmail: reminderFields.skipEmail.optional(),
});

/** PATCH /reminders/[id] — only the fields sent are changed. */
export const reminderUpdateSchema = z.object({
  title: reminderFields.title.optional(),
  body: reminderFields.body.optional(),
  time: reminderFields.time.optional(),
  minutesBefore: reminderFields.minutesBefore.optional(),
  recurrence: reminderFields.recurrence.optional(),
  intervalMinutes: reminderFields.intervalMinutes.optional(),
  intervalStart: reminderFields.intervalStart.optional(),
  intervalEnd: reminderFields.intervalEnd.optional(),
  daysOfWeek: reminderFields.daysOfWeek.optional(),
  onceDate: reminderFields.onceDate.optional(),
  skipEmail: reminderFields.skipEmail.optional(),
}).refine(atLeastOneField, "Send at least one field");

export const reminderFromTemplateSchema = z.object({ templateKey: reminderTemplateKey });

export const reminderEnabledSchema = z.object({ isEnabled: z.boolean() });

// ── Sharing / feedback ──────────────────────────────────────────────────────

export const shareSchema = z.object({ sharedWithUserId: z.string().min(1).max(64) });

export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  rating: rating.optional(),
  message: text(2000),
});

// ── Push (Expo) ─────────────────────────────────────────────────────────────

/** `ExponentPushToken[…]` from expo-notifications' getExpoPushTokenAsync(). */
export const expoPushToken = z
  .string()
  .max(200)
  .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, "Expected an Expo push token");

/** POST /push/expo-token — call after sign-in and whenever the token changes. */
export const expoTokenSchema = z.object({
  token: expoPushToken,
  platform: z.enum(["ios", "android"]),
});

/** DELETE /push/expo-token — call before signing out. */
export const expoTokenDeleteSchema = z.object({ token: expoPushToken });
