CREATE TABLE "exercise_tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exercise_name_norm" text NOT NULL,
	"exercise_notes" text DEFAULT '' NOT NULL,
	"tips" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "interval_minutes" integer;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "interval_start" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "interval_end" text;--> statement-breakpoint
ALTER TABLE "exercise_tips" ADD CONSTRAINT "exercise_tips_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_tips_user_exercise_idx" ON "exercise_tips" USING btree ("user_id","exercise_name_norm","exercise_notes");