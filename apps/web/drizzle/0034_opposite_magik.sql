ALTER TABLE "exercise_demos" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "exercise_demos" ADD COLUMN "overview" text;--> statement-breakpoint
ALTER TABLE "exercise_demos" ADD COLUMN "tips" jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "locale" text DEFAULT 'tr' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_locale_check" CHECK ("user"."locale" IN ('tr', 'en'));