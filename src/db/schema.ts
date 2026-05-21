import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Billing address captured at iyzico checkout (KVKK invoicing requirement).
export type BillingAddress = {
  fullName: string;
  line1: string;
  city: string;
  country: string;
  zip?: string;
  phone?: string;
};

// ── Auth tables (better-auth) ──

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    height: integer("height"),
    weight: numeric("weight"),
    targetWeight: numeric("target_weight"),
    healthNotes: text("health_notes"),
    foodAllergens: text("food_allergens"),
    dailyRoutine: jsonb("daily_routine"),
    weekendRoutine: jsonb("weekend_routine"),
    supplementSchedule: jsonb("supplement_schedule"),
    fitnessLevel: text("fitness_level"),
    fitnessGoal: text("fitness_goal"),
    sportHistory: text("sport_history"),
    currentMedications: text("current_medications"),
    serviceType: text("service_type").default("full"),
    age: integer("age"),
    isApproved: boolean("is_approved").default(false).notNull(),
    role: text("role").default("user"),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
    frozenAt: timestamp("frozen_at"),
    mustChangePassword: boolean("must_change_password").default(false),
    inviteExpiresAt: timestamp("invite_expires_at"),
    membershipType: text("membership_type"),
    membershipStartDate: timestamp("membership_start_date"),
    membershipEndDate: timestamp("membership_end_date"),
    membershipNotifiedAt: timestamp("membership_notified_at"),
    // ── Billing / subscription (Lemon Squeezy + iyzico) ──
    // All nullable with no default: legacy/admin-invited rows stay null and
    // fall into the legacy branch of getEntitlement(). New billing rows set
    // subscriptionStatus explicitly (incl. 'none' for admin-invited users).
    lemonSqueezyCustomerId: text("lemonsqueezy_customer_id"),
    lemonSqueezySubscriptionId: text("lemonsqueezy_subscription_id"),
    iyzicoCustomerRef: text("iyzico_customer_ref"),
    iyzicoSubscriptionRef: text("iyzico_subscription_ref"),
    subscriptionStatus: text("subscription_status"),
    billingTier: text("billing_tier"),
    billingInterval: text("billing_interval"),
    billingProvider: text("billing_provider"),
    trialEndsAt: timestamp("trial_ends_at"),
    trialNotifiedAt: timestamp("trial_notified_at"),
    nextBillingDate: timestamp("next_billing_date"),
    paymentFailedAt: timestamp("payment_failed_at"),
    cancelledAt: timestamp("cancelled_at"),
    iyzicoIdentityNumber: text("iyzico_identity_number"),
    billingAddress: jsonb("billing_address").$type<BillingAddress>(),
    taxNumber: text("tax_number"),
    hasSeenOnboarding: boolean("has_seen_onboarding").default(false),
    targetCalories: integer("target_calories"),
    targetProteinG: numeric("target_protein_g"),
    targetCarbsG: numeric("target_carbs_g"),
    targetFatG: numeric("target_fat_g"),
    weightUnit: text("weight_unit").default("kg"),
    energyUnit: text("energy_unit").default("kcal"),
    gender: text("gender"),
    dailyActivityLevel: text("daily_activity_level"),
    hasEatingDisorderHistory: boolean("has_eating_disorder_history").default(false),
    isPregnantOrBreastfeeding: boolean("is_pregnant_or_breastfeeding").default(false),
    hasDiabetes: boolean("has_diabetes").default(false),
    hasThyroidCondition: boolean("has_thyroid_condition").default(false),
    locale: text("locale").default("tr").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check(
      "user_gender_check",
      sql`${t.gender} IS NULL OR ${t.gender} IN ('male', 'female', 'prefer_not_to_say')`,
    ),
    check(
      "user_daily_activity_level_check",
      sql`${t.dailyActivityLevel} IS NULL OR ${t.dailyActivityLevel} IN ('sedentary', 'light', 'moderate', 'very_active')`,
    ),
    check(
      "user_fitness_goal_check",
      sql`${t.fitnessGoal} IS NULL OR ${t.fitnessGoal} IN ('loss', 'recomp', 'maintain', 'muscle_gain', 'weight_gain')`,
    ),
    check(
      "user_service_type_check",
      sql`${t.serviceType} IN ('full', 'nutrition')`,
    ),
    check(
      "user_locale_check",
      sql`${t.locale} IN ('tr', 'en')`,
    ),
    check(
      "user_subscription_status_check",
      sql`${t.subscriptionStatus} IS NULL OR ${t.subscriptionStatus} IN ('none', 'trialing', 'active', 'past_due', 'cancelled', 'expired')`,
    ),
    check(
      "user_billing_tier_check",
      sql`${t.billingTier} IS NULL OR ${t.billingTier} IN ('pro', 'elite')`,
    ),
    check(
      "user_billing_interval_check",
      sql`${t.billingInterval} IS NULL OR ${t.billingInterval} IN ('monthly', 'yearly')`,
    ),
    check(
      "user_billing_provider_check",
      sql`${t.billingProvider} IS NULL OR ${t.billingProvider} IN ('lemonsqueezy', 'iyzico', 'admin')`,
    ),
  ],
);

export const userFoods = pgTable("user_foods", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  portion: text("portion").notNull(),
  calories: integer("calories").notNull(),
  proteinG: numeric("protein_g"),
  carbsG: numeric("carbs_g"),
  fatG: numeric("fat_g"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: text("impersonated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── App tables ──

export const weeklyPlans = pgTable(
  "weekly_plans",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    title: text("title").notNull(),
    phase: text("phase").notNull(),
    notes: text("notes"),
    supplements: jsonb("supplements"),
    startDate: date("start_date"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("weekly_plans_user_week_idx").on(table.userId, table.weekNumber),
    // Date-range scans for /takvim, shared plans, dashboard.
    index("weekly_plans_user_start_idx").on(table.userId, table.startDate),
  ],
);

export const dailyPlans = pgTable(
  "daily_plans",
  {
    id: serial("id").primaryKey(),
    weeklyPlanId: integer("weekly_plan_id").references(() => weeklyPlans.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    dayName: text("day_name").notNull(),
    planType: text("plan_type").notNull(),
    workoutTitle: text("workout_title"),
    date: date("date"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    check(
      "daily_plans_plan_type_check",
      sql`${t.planType} IN ('workout', 'swimming', 'rest', 'nutrition')`,
    ),
    // Day detail page + cron reminder lookups.
    index("daily_plans_weekly_date_idx").on(t.weeklyPlanId, t.date),
  ],
);

export const meals = pgTable(
  "meals",
  {
    id: serial("id").primaryKey(),
    dailyPlanId: integer("daily_plan_id").references(() => dailyPlans.id, { onDelete: "cascade" }),
    mealTime: text("meal_time").notNull(),
    mealLabel: text("meal_label").notNull(),
    content: text("content").notNull(),
    calories: integer("calories"),
    proteinG: numeric("protein_g"),
    carbsG: numeric("carbs_g"),
    fatG: numeric("fat_g"),
    icon: text("icon"),
    isCompleted: boolean("is_completed").default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    check(
      "meals_meal_label_check",
      sql`${t.mealLabel} IN ('Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Ara Öğün', 'Erken Protein', 'Pre-Workout', 'Post-Workout', 'Akşam Atıştırması')`,
    ),
    // Day detail page lists meals grouped + ordered per plan.
    index("meals_daily_plan_sort_idx").on(t.dailyPlanId, t.sortOrder),
  ],
);

export const exercises = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    dailyPlanId: integer("daily_plan_id").references(() => dailyPlans.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    sectionLabel: text("section_label").notNull(),
    name: text("name").notNull(),
    englishName: text("english_name"),
    sets: integer("sets"),
    reps: text("reps"),
    restSeconds: integer("rest_seconds"),
    durationMinutes: integer("duration_minutes"),
    notes: text("notes"),
    isCompleted: boolean("is_completed").default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    // Intensity tag — currently only emitted for swimming sections, used to
    // weight nutrition carb-pump targets. Null for non-swimming or untagged.
    intensity: text("intensity"),
  },
  (t) => [
    check(
      "exercises_section_check",
      sql`${t.section} IN ('warmup', 'main', 'cooldown', 'sauna', 'swimming')`,
    ),
    check(
      "exercises_rest_seconds_check",
      sql`${t.restSeconds} IS NULL OR (${t.restSeconds} >= 30 AND ${t.restSeconds} <= 300)`,
    ),
    check(
      "exercises_duration_minutes_check",
      sql`${t.durationMinutes} IS NULL OR (${t.durationMinutes} >= 1 AND ${t.durationMinutes} <= 90)`,
    ),
    check(
      "exercises_intensity_check",
      sql`${t.intensity} IS NULL OR ${t.intensity} IN ('low', 'moderate', 'high')`,
    ),
    // Day detail page lists exercises grouped + ordered per plan.
    index("exercises_daily_plan_sort_idx").on(t.dailyPlanId, t.sortOrder),
  ],
);

export const supplements = pgTable("supplements", {
  id: serial("id").primaryKey(),
  weeklyPlanId: integer("weekly_plan_id").references(() => weeklyPlans.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  timing: text("timing").notNull(),
  notes: text("notes"),
  startWeek: integer("start_week").notNull(),
  presetKey: text("preset_key"),
  servingsPerDose: numeric("servings_per_dose"),
  caloriesPerServing: integer("calories_per_serving"),
  proteinPerServing: numeric("protein_per_serving"),
  carbsPerServing: numeric("carbs_per_serving"),
  fatPerServing: numeric("fat_per_serving"),
  // Day-of-week subset the supplement is taken on (0 = Mon … 6 = Sun).
  // null = every day. Stored as jsonb so we can hold a sparse array.
  frequencyDays: jsonb("frequency_days"),
  // Doses per active day. 1 = once a day, 2 = morning + evening, etc.
  dosesPerDay: integer("doses_per_day").default(1).notNull(),
});

export const supplementCompletions = pgTable(
  "supplement_completions",
  {
    id: serial("id").primaryKey(),
    supplementId: integer("supplement_id")
      .notNull()
      .references(() => supplements.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    completionDate: date("completion_date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("supplement_completion_unique").on(
      table.supplementId,
      table.userId,
      table.completionDate,
    ),
  ],
);

export const progressLogs = pgTable(
  "progress_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
  // Ana Bilgiler
  weight: numeric("weight"),
  fluidPercent: numeric("fluid_percent"),
  fluidKg: numeric("fluid_kg"),
  fatPercent: numeric("fat_percent"),
  fatKg: numeric("fat_kg"),
  bmi: numeric("bmi"),
  // Vücut Bölgeleri — Sol Kol
  leftArmFatPercent: numeric("left_arm_fat_percent"),
  leftArmFatKg: numeric("left_arm_fat_kg"),
  leftArmMusclePercent: numeric("left_arm_muscle_percent"),
  leftArmMuscleKg: numeric("left_arm_muscle_kg"),
  // Vücut Bölgeleri — Sağ Kol
  rightArmFatPercent: numeric("right_arm_fat_percent"),
  rightArmFatKg: numeric("right_arm_fat_kg"),
  rightArmMusclePercent: numeric("right_arm_muscle_percent"),
  rightArmMuscleKg: numeric("right_arm_muscle_kg"),
  // Vücut Bölgeleri — Gövde
  torsoFatPercent: numeric("torso_fat_percent"),
  torsoFatKg: numeric("torso_fat_kg"),
  torsoMusclePercent: numeric("torso_muscle_percent"),
  torsoMuscleKg: numeric("torso_muscle_kg"),
  // Vücut Bölgeleri — Sol Bacak
  leftLegFatPercent: numeric("left_leg_fat_percent"),
  leftLegFatKg: numeric("left_leg_fat_kg"),
  leftLegMusclePercent: numeric("left_leg_muscle_percent"),
  leftLegMuscleKg: numeric("left_leg_muscle_kg"),
  // Vücut Bölgeleri — Sağ Bacak
  rightLegFatPercent: numeric("right_leg_fat_percent"),
  rightLegFatKg: numeric("right_leg_fat_kg"),
  rightLegMusclePercent: numeric("right_leg_muscle_percent"),
  rightLegMuscleKg: numeric("right_leg_muscle_kg"),
  // Ölçüler (cm)
  waistCm: numeric("waist_cm"),
  rightArmCm: numeric("right_arm_cm"),
  leftArmCm: numeric("left_arm_cm"),
  rightLegCm: numeric("right_leg_cm"),
  leftLegCm: numeric("left_leg_cm"),
    // Meta
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    // Hot path: progress chart, AI analyze/target-weight read latest N logs.
    index("progress_logs_user_date_idx").on(t.userId, t.logDate),
  ],
);

export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  weeklyPlanId: integer("weekly_plan_id").references(() => weeklyPlans.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  itemName: text("item_name").notNull(),
  quantity: text("quantity").notNull(),
  notes: text("notes"),
  isPurchased: boolean("is_purchased").default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  mealIds: jsonb("meal_ids").$type<number[]>(),
});

export const shares = pgTable(
  "shares",
  {
    id: serial("id").primaryKey(),
    weeklyPlanId: integer("weekly_plan_id")
      .notNull()
      .references(() => weeklyPlans.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sharedWithUserId: text("shared_with_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    // /paylasilan list (plans shared TO me) + revoke flows (plans I shared).
    index("shares_shared_with_idx").on(t.sharedWithUserId),
    index("shares_weekly_plan_idx").on(t.weeklyPlanId),
  ],
);

// ── Notification tables ──

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    isRead: boolean("is_read").default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    // Bell unread count polls every 30s — needs (userId, isRead) for the
    // filter and createdAt for the dropdown's ORDER BY desc.
    index("notifications_user_read_created_idx").on(
      t.userId,
      t.isRead,
      t.createdAt,
    ),
  ],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  inAppEnabled: boolean("in_app_enabled").default(false),
  emailEnabled: boolean("email_enabled").default(false),
  pushEnabled: boolean("push_enabled").default(false),
  defaultWorkoutTime: text("default_workout_time"),
  timezone: text("timezone"),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  weekStartsOn: text("week_starts_on"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Reminder tables ──

export const reminders = pgTable(
  "reminders",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    templateKey: text("template_key"),
    time: text("time"),
    minutesBefore: integer("minutes_before"),
    recurrence: text("recurrence").notNull().default("daily"),
    intervalMinutes: integer("interval_minutes"),
    intervalStart: text("interval_start"),
    intervalEnd: text("interval_end"),
    daysOfWeek: jsonb("days_of_week"),
    onceDate: date("once_date"),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    skipEmail: boolean("skip_email").default(true),
    lastFiredAt: timestamp("last_fired_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  // Partial index on enabled rows only — the cron scans this table every
  // 5 minutes and a seq-scan was the dominant CU-hour cost on Neon free tier.
  (t) => [
    index("reminders_enabled_user_idx")
      .on(t.userId)
      .where(sql`${t.isEnabled} = true`),
  ],
);

export const exerciseTips = pgTable("exercise_tips", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  exerciseNameNorm: text("exercise_name_norm").notNull(),
  exerciseNotes: text("exercise_notes").notNull().default(""),
  tips: text("tips").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("exercise_tips_user_exercise_idx").on(
    table.userId,
    table.exerciseNameNorm,
    table.exerciseNotes,
  ),
]);

export const exerciseAlternatives = pgTable("exercise_alternatives", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  exerciseNameNorm: text("exercise_name_norm").notNull(),
  suggestions: jsonb("suggestions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("exercise_alternatives_user_exercise_idx").on(
    table.userId,
    table.exerciseNameNorm,
  ),
]);

export const exerciseDemos = pgTable("exercise_demos", {
  id: serial("id").primaryKey(),
  exerciseNameNorm: text("exercise_name_norm").notNull().unique(),
  externalId: text("external_id"),
  images: jsonb("images"),
  gifUrl: text("gif_url"),
  videoUrl: text("video_url"),
  source: text("source"),
  primaryMuscles: jsonb("primary_muscles"),
  secondaryMuscles: jsonb("secondary_muscles"),
  equipment: text("equipment"),
  instructions: jsonb("instructions"),
  overview: text("overview"),
  tips: jsonb("tips"),
  notFound: boolean("not_found").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── AI Usage Logs ──

export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feature: text("feature").notNull(),
    promptVersion: text("prompt_version"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    durationMs: integer("duration_ms"),
    status: text("status").default("success").notNull(),
    errorMessage: text("error_message"),
    estCostUsd: numeric("est_cost_usd"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // Every AI call runs checkRateLimit which filters by (userId, feature,
    // status, createdAt >= start-of-day). Without this index Postgres
    // sequential-scans a constantly-growing table on every AI request.
    index("ai_usage_logs_user_feature_status_created_idx").on(
      t.userId,
      t.feature,
      t.status,
      t.createdAt,
    ),
  ],
);

// ── AI Plan Suggestions (saved for later reuse) ──

export const aiPlanSuggestions = pgTable("ai_plan_suggestions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  phase: text("phase").notNull(),
  userNote: text("user_note"),
  plan: jsonb("plan").notNull(),
  originalDate: date("original_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── AI Daily Meal Suggestions (saved for later reuse) ──

export const aiDailyMealSuggestions = pgTable("ai_daily_meal_suggestions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planType: text("plan_type").notNull(),
  userNote: text("user_note"),
  meals: jsonb("meals").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Saved Meal Suggestions ──

export const savedMealSuggestions = pgTable("saved_meal_suggestions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mealLabel: text("meal_label").notNull(),
  content: text("content").notNull(),
  calories: integer("calories"),
  proteinG: numeric("protein_g"),
  carbsG: numeric("carbs_g"),
  fatG: numeric("fat_g"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Chat Messages ──

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // /asistan loads last N messages per user, ordered by createdAt.
    index("chat_messages_user_created_idx").on(t.userId, t.createdAt),
  ],
);

// ── Feedbacks ──

export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  rating: integer("rating"),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  adminResponse: text("admin_response"),
  respondedByAdminId: text("responded_by_admin_id")
    .references(() => users.id),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Water Logs ──

export const waterLogs = pgTable("water_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  logDate: date("log_date").notNull(),
  glasses: integer("glasses").notNull().default(0),
  targetGlasses: integer("target_glasses").notNull().default(8),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("water_log_user_date_idx").on(table.userId, table.logDate),
]);

// ── Sleep Logs ──

export const sleepLogs = pgTable("sleep_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  logDate: date("log_date").notNull(),
  bedtime: text("bedtime").notNull(),
  wakeTime: text("wake_time").notNull(),
  durationMinutes: integer("duration_minutes"),
  quality: integer("quality"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("sleep_log_user_date_idx").on(table.userId, table.logDate),
]);

// ── Readiness Logs ──
// Subjective daily wellness rating. Both energyRating (1=low, 5=high) and
// painScore (1=none, 5=severe) are nullable so the form can submit either
// one alone. Pasif readiness score is computed without this row; this table
// only stores the *optional* subjective layer.
export const readinessLogs = pgTable(
  "readiness_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    energyRating: integer("energy_rating"),
    painScore: integer("pain_score"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("readiness_log_user_date_idx").on(t.userId, t.logDate),
    check(
      "readiness_energy_check",
      sql`${t.energyRating} IS NULL OR (${t.energyRating} >= 1 AND ${t.energyRating} <= 5)`,
    ),
    check(
      "readiness_pain_check",
      sql`${t.painScore} IS NULL OR (${t.painScore} >= 1 AND ${t.painScore} <= 5)`,
    ),
  ],
);

// ── Audit Logs ──

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  adminId: text("admin_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Daily AI Greetings ──

export const dailyGreetings = pgTable(
  "daily_greetings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    locale: text("locale").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.date, t.locale] }),
    check(
      "daily_greetings_locale_check",
      sql`${t.locale} IN ('tr', 'en')`,
    ),
  ],
);

// ── Cookie Consents ──

export const cookieConsents = pgTable("cookie_consents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"),
  necessary: boolean("necessary").default(true).notNull(),
  analytics: boolean("analytics").default(false).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentedAt: timestamp("consented_at").defaultNow().notNull(),
});

// ── Billing: invoices ──

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref").notNull(),
    amount: numeric("amount").notNull(),
    // Tax breakdown — nullable: legacy rows and providers that omit the
    // figures keep null, and the receipt falls back to subtotal = amount.
    subtotal: numeric("subtotal"),
    tax: numeric("tax"),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    pdfUrl: text("pdf_url"),
    issuedAt: timestamp("issued_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("invoices_provider_ref_idx").on(t.provider, t.providerRef),
    check(
      "invoices_provider_check",
      sql`${t.provider} IN ('lemonsqueezy', 'iyzico')`,
    ),
    // Billing history page: user's invoices ordered desc by issuedAt.
    index("invoices_user_issued_idx").on(t.userId, t.issuedAt),
  ],
);

// ── Billing: webhook event log (idempotency) ──
// A processed webhook is recorded by (provider, externalId). The unique index
// lets handlers detect replays: a conflicting insert means "already handled".

// Webhook event log + idempotency tracker.
//
// `processedAt` records when the row was claimed (first INSERT). `succeededAt`
// flips from NULL → timestamp only after the handler's side effects all
// complete. A replay sees:
//   - succeededAt IS NOT NULL → true duplicate, return early
//   - succeededAt IS NULL     → previous attempt crashed mid-flight, retry
// This way a partial failure (DB updated but notification crashed, or vice
// versa) won't get silently dropped because the dedup row was written too early.
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    eventName: text("event_name"),
    payload: jsonb("payload"),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
    succeededAt: timestamp("succeeded_at"),
  },
  (t) => [
    uniqueIndex("webhook_events_provider_external_idx").on(
      t.provider,
      t.externalId,
    ),
    check(
      "webhook_events_provider_check",
      sql`${t.provider} IN ('lemonsqueezy', 'iyzico')`,
    ),
  ],
);
