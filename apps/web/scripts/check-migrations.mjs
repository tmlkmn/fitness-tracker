import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5`;
console.log("Last 5 applied migrations:");
console.log(JSON.stringify(rows, null, 2));

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'webhook_events' ORDER BY ordinal_position`;
console.log("\nwebhook_events columns:", cols.map(r => r.column_name));

const idx = await sql`
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public'
  AND (indexname LIKE '%user_feature_status%' OR indexname LIKE '%user_read_created%' OR indexname LIKE '%progress_logs_user_date%' OR indexname LIKE '%weekly_plans_user_start%' OR indexname LIKE '%daily_plans_weekly_date%')
  ORDER BY indexname`;
console.log("\nNew indexes present:", idx.map(r => r.indexname));
