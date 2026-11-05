CREATE TABLE "ai_plan_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"phase" text NOT NULL,
	"user_note" text,
	"plan" jsonb NOT NULL,
	"original_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_plan_suggestions" ADD CONSTRAINT "ai_plan_suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;