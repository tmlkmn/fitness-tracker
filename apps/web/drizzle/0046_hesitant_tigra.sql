ALTER TABLE "user" ADD COLUMN "target_calorie_delta" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "target_protein_per_kg" numeric;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "target_fat_pct" numeric;--> statement-breakpoint
ALTER TABLE "weekly_plans" ADD COLUMN "macro_target_snapshot" jsonb;