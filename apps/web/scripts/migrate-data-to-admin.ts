/**
 * Migrates existing plan data (weeklyPlans, and all cascading data)
 * to the admin user. Also sets NULL userId columns on progressLogs.
 *
 * Run: npx tsx scripts/migrate-data-to-admin.ts
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq, isNull } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  // 1. Find the admin user
  const admins = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.role, "admin"));

  if (admins.length === 0) {
    console.error("No admin user found. Run the seed first.");
    process.exit(1);
  }

  const admin = admins[0];
  console.log(`Admin user: ${admin.email} (${admin.id})`);

  // 2. Update all weeklyPlans to belong to admin
  const weekResult = await db
    .update(schema.weeklyPlans)
    .set({ userId: admin.id })
    .returning({ id: schema.weeklyPlans.id });

  console.log(`Updated ${weekResult.length} weekly plans -> admin`);

  // 3. Update progressLogs with NULL userId to admin
  const progressResult = await db
    .update(schema.progressLogs)
    .set({ userId: admin.id })
    .where(isNull(schema.progressLogs.userId))
    .returning({ id: schema.progressLogs.id });

  console.log(`Updated ${progressResult.length} progress logs -> admin`);

  // 4. Update shares ownerUserId where needed
  const shareResult = await db
    .update(schema.shares)
    .set({ ownerUserId: admin.id })
    .returning({ id: schema.shares.id });

  console.log(`Updated ${shareResult.length} shares -> admin`);

  console.log("Migration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
