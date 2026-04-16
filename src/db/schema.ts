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
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Auth tables (better-auth) ──

export const users = pgTable("user", {
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
  supplementSchedule: jsonb("supplement_schedule"),
  fitnessLevel: text("fitness_level"),
  sportHistory: text("sport_history"),
  currentMedications: text("current_medications"),
  serviceType: text("service_type").default("full"),
  age: integer("age"),
  isApproved: boolean("is_approved").default(false).notNull(),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  mustChangePassword: boolean("must_change_password").default(false),
  inviteExpiresAt: timestamp("invite_expires_at"),
  membershipType: text("membership_type"),
  membershipStartDate: timestamp("membership_start_date"),
  membershipEndDate: timestamp("membership_end_date"),
  membershipNotifiedAt: timestamp("membership_notified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
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
    .references(() => users.id),
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

export const weeklyPlans = pgTable("weekly_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  phase: text("phase").notNull(),
  notes: text("notes"),
  supplements: jsonb("supplements"),
  startDate: date("start_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyPlans = pgTable("daily_plans", {
  id: serial("id").primaryKey(),
  weeklyPlanId: integer("weekly_plan_id").references(() => weeklyPlans.id),
  dayOfWeek: integer("day_of_week").notNull(),
  dayName: text("day_name").notNull(),
  planType: text("plan_type").notNull(),
  workoutTitle: text("workout_title"),
  date: date("date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  dailyPlanId: integer("daily_plan_id").references(() => dailyPlans.id),
  mealTime: text("meal_time").notNull(),
  mealLabel: text("meal_label").notNull(),
  content: text("content").notNull(),
  calories: integer("calories"),
  proteinG: numeric("protein_g"),
  carbsG: numeric("carbs_g"),
  fatG: numeric("fat_g"),
  isCompleted: boolean("is_completed").default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  dailyPlanId: integer("daily_plan_id").references(() => dailyPlans.id),
  section: text("section").notNull(),
  sectionLabel: text("section_label").notNull(),
  name: text("name").notNull(),
  sets: integer("sets"),
  reps: text("reps"),
  restSeconds: integer("rest_seconds"),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const supplements = pgTable("supplements", {
  id: serial("id").primaryKey(),
  weeklyPlanId: integer("weekly_plan_id").references(() => weeklyPlans.id),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  timing: text("timing").notNull(),
  notes: text("notes"),
  startWeek: integer("start_week").notNull(),
});

export const progressLogs = pgTable("progress_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
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
});

export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  weeklyPlanId: integer("weekly_plan_id").references(() => weeklyPlans.id),
  category: text("category").notNull(),
  itemName: text("item_name").notNull(),
  quantity: text("quantity").notNull(),
  notes: text("notes"),
  isPurchased: boolean("is_purchased").default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const shares = pgTable("shares", {
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
});

// ── Notification tables ──

export const notifications = pgTable("notifications", {
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
});

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
  inAppEnabled: boolean("in_app_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(true),
  pushEnabled: boolean("push_enabled").default(true),
  defaultWorkoutTime: text("default_workout_time"),
  timezone: text("timezone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Reminder tables ──

export const reminders = pgTable("reminders", {
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
});

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

export const exerciseDemos = pgTable("exercise_demos", {
  id: serial("id").primaryKey(),
  exerciseNameNorm: text("exercise_name_norm").notNull().unique(),
  externalId: text("external_id"),
  images: jsonb("images"),
  primaryMuscles: jsonb("primary_muscles"),
  secondaryMuscles: jsonb("secondary_muscles"),
  equipment: text("equipment"),
  instructions: jsonb("instructions"),
  notFound: boolean("not_found").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── AI Usage Logs ──

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  feature: text("feature").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Chat Messages ──

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
