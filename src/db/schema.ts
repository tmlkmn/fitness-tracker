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
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  height: integer("height"),
  weight: numeric("weight"),
  targetWeight: numeric("target_weight"),
  healthNotes: text("health_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const weeklyPlans = pgTable("weekly_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  phase: text("phase").notNull(),
  notes: text("notes"),
  supplements: jsonb("supplements"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyPlans = pgTable("daily_plans", {
  id: serial("id").primaryKey(),
  weeklyPlanId: integer("weekly_plan_id").references(() => weeklyPlans.id),
  dayOfWeek: integer("day_of_week").notNull(),
  dayName: text("day_name").notNull(),
  planType: text("plan_type").notNull(),
  workoutTitle: text("workout_title"),
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
  userId: integer("user_id").references(() => users.id),
  logDate: date("log_date").notNull(),
  weight: numeric("weight"),
  waistCm: numeric("waist_cm"),
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
