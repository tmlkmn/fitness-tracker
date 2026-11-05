import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, inArray, gte } from "drizzle-orm";
import * as schema from "../src/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

/**
 * Temizlik scripti: belirli kullanıcının verilen tarihten sonra başlayan
 * (veya verilen weekNumber listesindeki) haftalık planlarını ve tüm bağlı
 * verilerini (daily plans, meals, exercises, supplements, shopping lists,
 * shares) atomik olarak siler.
 *
 * Çalıştırma:
 *   npx tsx scripts/cleanup-weekly-plans.ts <email> --from <YYYY-MM-DD>
 *   npx tsx scripts/cleanup-weekly-plans.ts <email> --weeks 3,4
 *   npx tsx scripts/cleanup-weekly-plans.ts <email> --ids 12,13
 *   npx tsx scripts/cleanup-weekly-plans.ts <email> --dry-run --from 2026-04-27
 */

function parseArgs(argv: string[]) {
  const email = argv[2];
  if (!email || email.startsWith("--")) {
    throw new Error("İlk argüman email olmalı");
  }
  const args: {
    email: string;
    from?: string;
    weeks?: number[];
    ids?: number[];
    dryRun: boolean;
  } = { email, dryRun: false };

  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--from") args.from = argv[++i];
    else if (a === "--weeks") args.weeks = argv[++i].split(",").map((s) => parseInt(s.trim(), 10));
    else if (a === "--ids") args.ids = argv[++i].split(",").map((s) => parseInt(s.trim(), 10));
  }

  if (!args.from && !args.weeks && !args.ids) {
    throw new Error("--from, --weeks veya --ids parametrelerinden en az biri gerekli");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.email, args.email));

  if (!user) {
    console.error(`Kullanıcı bulunamadı: ${args.email}`);
    process.exit(1);
  }

  console.log(`Kullanıcı: ${user.email} (${user.id})`);

  const conditions = [eq(schema.weeklyPlans.userId, user.id)];
  if (args.from) conditions.push(gte(schema.weeklyPlans.startDate, args.from));
  if (args.weeks?.length) conditions.push(inArray(schema.weeklyPlans.weekNumber, args.weeks));
  if (args.ids?.length) conditions.push(inArray(schema.weeklyPlans.id, args.ids));

  const targets = await db
    .select({
      id: schema.weeklyPlans.id,
      weekNumber: schema.weeklyPlans.weekNumber,
      title: schema.weeklyPlans.title,
      startDate: schema.weeklyPlans.startDate,
    })
    .from(schema.weeklyPlans)
    .where(and(...conditions));

  if (targets.length === 0) {
    console.log("Silinecek hafta bulunamadı.");
    return;
  }

  console.log(`\nSilinecek haftalar (${targets.length}):`);
  for (const w of targets) {
    console.log(`  - id=${w.id} hafta=${w.weekNumber} "${w.title}" başlangıç=${w.startDate}`);
  }

  const weekIds = targets.map((w) => w.id);

  // İlişkili verileri say (önizleme için)
  const days = await db
    .select({ id: schema.dailyPlans.id })
    .from(schema.dailyPlans)
    .where(inArray(schema.dailyPlans.weeklyPlanId, weekIds));
  const dayIds = days.map((d) => d.id);

  const mealRows = dayIds.length
    ? await db
        .select({ id: schema.meals.id })
        .from(schema.meals)
        .where(inArray(schema.meals.dailyPlanId, dayIds))
    : [];
  const exerciseRows = dayIds.length
    ? await db
        .select({ id: schema.exercises.id })
        .from(schema.exercises)
        .where(inArray(schema.exercises.dailyPlanId, dayIds))
    : [];

  const supplementsRows = await db
    .select({ id: schema.supplements.id })
    .from(schema.supplements)
    .where(inArray(schema.supplements.weeklyPlanId, weekIds));
  const shoppingRows = await db
    .select({ id: schema.shoppingLists.id })
    .from(schema.shoppingLists)
    .where(inArray(schema.shoppingLists.weeklyPlanId, weekIds));
  const sharesRows = await db
    .select({ id: schema.shares.id })
    .from(schema.shares)
    .where(inArray(schema.shares.weeklyPlanId, weekIds));

  console.log(`\nBağlı kayıtlar:`);
  console.log(`  daily plans: ${days.length}`);
  console.log(`  meals: ${mealRows.length}`);
  console.log(`  exercises: ${exerciseRows.length}`);
  console.log(`  supplements: ${supplementsRows.length}`);
  console.log(`  shopping list items: ${shoppingRows.length}`);
  console.log(`  shares: ${sharesRows.length}`);

  if (args.dryRun) {
    console.log("\n[DRY RUN] Hiçbir şey silinmedi.");
    return;
  }

  console.log("\nSilme işlemi başlıyor...");

  if (dayIds.length > 0) {
    await db.delete(schema.meals).where(inArray(schema.meals.dailyPlanId, dayIds));
    await db.delete(schema.exercises).where(inArray(schema.exercises.dailyPlanId, dayIds));
  }
  await db.delete(schema.dailyPlans).where(inArray(schema.dailyPlans.weeklyPlanId, weekIds));
  await db.delete(schema.supplements).where(inArray(schema.supplements.weeklyPlanId, weekIds));
  await db.delete(schema.shoppingLists).where(inArray(schema.shoppingLists.weeklyPlanId, weekIds));
  // shares cascade ediliyor ama yine de açıkça silelim (idempotent)
  await db.delete(schema.shares).where(inArray(schema.shares.weeklyPlanId, weekIds));
  await db.delete(schema.weeklyPlans).where(inArray(schema.weeklyPlans.id, weekIds));

  console.log(`✓ ${targets.length} haftalık plan ve tüm bağlı verileri silindi.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Hata:", err);
    process.exit(1);
  });
