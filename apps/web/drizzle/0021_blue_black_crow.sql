CREATE TABLE "ai_daily_meal_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_type" text NOT NULL,
	"user_note" text,
	"meals" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_alternatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exercise_name_norm" text NOT NULL,
	"suggestions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_demos" ADD COLUMN "gif_url" text;--> statement-breakpoint
ALTER TABLE "exercise_demos" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "ai_daily_meal_suggestions" ADD CONSTRAINT "ai_daily_meal_suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_alternatives" ADD CONSTRAINT "exercise_alternatives_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_alternatives_user_exercise_idx" ON "exercise_alternatives" USING btree ("user_id","exercise_name_norm");