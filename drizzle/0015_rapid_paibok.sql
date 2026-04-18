CREATE TABLE "saved_meal_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"meal_label" text NOT NULL,
	"content" text NOT NULL,
	"calories" integer,
	"protein_g" numeric,
	"carbs_g" numeric,
	"fat_g" numeric,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "saved_meal_suggestions" ADD CONSTRAINT "saved_meal_suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;