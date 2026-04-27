ALTER TABLE "ai_usage_logs" ADD COLUMN "prompt_version" text;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD COLUMN "status" text DEFAULT 'success' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD COLUMN "est_cost_usd" numeric;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "daily_activity_level" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "has_eating_disorder_history" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_pregnant_or_breastfeeding" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "has_diabetes" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "has_thyroid_condition" boolean DEFAULT false;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_plans_user_week_idx" ON "weekly_plans" USING btree ("user_id","week_number");