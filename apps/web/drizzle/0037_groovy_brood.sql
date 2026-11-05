ALTER TABLE "supplements" ADD COLUMN "preset_key" text;--> statement-breakpoint
ALTER TABLE "supplements" ADD COLUMN "servings_per_dose" numeric;--> statement-breakpoint
ALTER TABLE "supplements" ADD COLUMN "calories_per_serving" integer;--> statement-breakpoint
ALTER TABLE "supplements" ADD COLUMN "protein_per_serving" numeric;--> statement-breakpoint
ALTER TABLE "supplements" ADD COLUMN "carbs_per_serving" numeric;--> statement-breakpoint
ALTER TABLE "supplements" ADD COLUMN "fat_per_serving" numeric;