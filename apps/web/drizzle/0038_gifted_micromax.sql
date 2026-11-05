ALTER TABLE "supplements" ADD COLUMN "frequency_days" jsonb;--> statement-breakpoint
ALTER TABLE "supplements" ADD COLUMN "doses_per_day" integer DEFAULT 1 NOT NULL;