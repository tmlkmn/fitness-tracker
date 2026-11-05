import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/db");
  const { dailyGreetings } = await import("../src/db/schema");
  const result = await db.delete(dailyGreetings);
  console.log("Deleted daily_greetings rows:", (result as { rowCount?: number }).rowCount ?? "?");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
