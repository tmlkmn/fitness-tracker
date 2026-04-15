import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // Clean slate
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
  console.log("Schema reset.");

  const migration = readFileSync("drizzle/0000_solid_leader.sql", "utf-8");
  const statements = migration
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql.query(stmt);
  }

  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log(
    "Tables:",
    tables.map((t) => t.tablename).join(", ")
  );
  console.log(`Migration applied: ${statements.length} statements.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
