import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'frozen_at'`;
  console.log("frozen_at column:", cols.length > 0 ? "EXISTS ✓" : "MISSING ✗");
  const fks = await sql`SELECT conname, confdeltype FROM pg_constraint WHERE conname = 'weekly_plans_user_id_user_id_fk'`;
  if (fks.length > 0) {
    const row = fks[0] as { conname: string; confdeltype: string };
    console.log("weekly_plans FK:", row.confdeltype === 'c' ? "CASCADE ✓" : `NOT CASCADE (${row.confdeltype}) ✗`);
  } else {
    console.log("weekly_plans FK: NOT FOUND ✗");
  }
}
main().catch(console.error);
