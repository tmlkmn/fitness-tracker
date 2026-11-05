CREATE TABLE "user_foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"portion" text NOT NULL,
	"calories" integer NOT NULL,
	"protein_g" numeric,
	"carbs_g" numeric,
	"fat_g" numeric,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "target_calories" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "target_protein_g" numeric;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "target_carbs_g" numeric;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "target_fat_g" numeric;--> statement-breakpoint
ALTER TABLE "user_foods" ADD CONSTRAINT "user_foods_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;