import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const statements = [
  `ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_user_id_user_id_fk"`,
  `ALTER TABLE "daily_plans" DROP CONSTRAINT IF EXISTS "daily_plans_weekly_plan_id_weekly_plans_id_fk"`,
  `ALTER TABLE "exercises" DROP CONSTRAINT IF EXISTS "exercises_daily_plan_id_daily_plans_id_fk"`,
  `ALTER TABLE "meals" DROP CONSTRAINT IF EXISTS "meals_daily_plan_id_daily_plans_id_fk"`,
  `ALTER TABLE "progress_logs" DROP CONSTRAINT IF EXISTS "progress_logs_user_id_user_id_fk"`,
  `ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk"`,
  `ALTER TABLE "shopping_lists" DROP CONSTRAINT IF EXISTS "shopping_lists_weekly_plan_id_weekly_plans_id_fk"`,
  `ALTER TABLE "supplements" DROP CONSTRAINT IF EXISTS "supplements_weekly_plan_id_weekly_plans_id_fk"`,
  `ALTER TABLE "weekly_plans" DROP CONSTRAINT IF EXISTS "weekly_plans_user_id_user_id_fk"`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "frozen_at" timestamp`,
  `ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_weekly_plan_id_weekly_plans_id_fk" FOREIGN KEY ("weekly_plan_id") REFERENCES "public"."weekly_plans"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "exercises" ADD CONSTRAINT "exercises_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "meals" ADD CONSTRAINT "meals_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "progress_logs" ADD CONSTRAINT "progress_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_weekly_plan_id_weekly_plans_id_fk" FOREIGN KEY ("weekly_plan_id") REFERENCES "public"."weekly_plans"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "supplements" ADD CONSTRAINT "supplements_weekly_plan_id_weekly_plans_id_fk" FOREIGN KEY ("weekly_plan_id") REFERENCES "public"."weekly_plans"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action`,
];

async function main() {
  for (const stmt of statements) {
    console.log("Running:", stmt.slice(0, 90));
    await sql.query(stmt);
    console.log("  OK");
  }
  // Mark migration as applied in drizzle's migration table
  try {
    // Try different possible table names
    const tables = ['"__drizzle_migrations"', 'drizzle."__drizzle_migrations"'];
    for (const tbl of tables) {
      try {
        await sql.query(
          `INSERT INTO ${tbl} (hash, created_at) VALUES ('0035_careless_trauma', $1) ON CONFLICT DO NOTHING`,
          [Date.now()]
        );
        console.log(`Migration 0035 marked as applied in ${tbl}`);
        break;
      } catch {
        // try next
      }
    }
  } catch (e) {
    console.log("Could not mark migration (may be OK):", e);
  }
  console.log("All done!");
}

main().catch(console.error);
