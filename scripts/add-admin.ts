import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { hashPassword } from "better-auth/crypto";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function addAdmin() {
  // Check if admin already exists
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, "temel.ekmen28@gmail.com"));

  if (existing.length > 0) {
    console.log("Admin already exists, updating password...");
    const hashed = await hashPassword("Admin123");
    await db
      .update(schema.accounts)
      .set({ password: hashed })
      .where(eq(schema.accounts.userId, existing[0].id));
    await db
      .update(schema.users)
      .set({ role: "admin", isApproved: true, mustChangePassword: false })
      .where(eq(schema.users.id, existing[0].id));
    console.log("✅ Admin password updated.");
    return;
  }

  const adminId = crypto.randomUUID();
  await db.insert(schema.users).values({
    id: adminId,
    name: "Admin",
    email: "temel.ekmen28@gmail.com",
    emailVerified: true,
    isApproved: true,
    role: "admin",
    mustChangePassword: false,
  });

  const hashed = await hashPassword("Admin123");
  await db.insert(schema.accounts).values({
    id: crypto.randomUUID(),
    userId: adminId,
    accountId: adminId,
    providerId: "credential",
    password: hashed,
  });

  console.log("✅ Admin user created: temel.ekmen28@gmail.com / Admin123");
}

addAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed:", err);
    process.exit(1);
  });
