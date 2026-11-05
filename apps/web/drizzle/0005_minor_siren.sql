CREATE TABLE "exercise_demos" (
	"id" serial PRIMARY KEY NOT NULL,
	"exercise_name_norm" text NOT NULL,
	"external_id" text,
	"images" jsonb,
	"primary_muscles" jsonb,
	"secondary_muscles" jsonb,
	"equipment" text,
	"instructions" jsonb,
	"not_found" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_demos_exercise_name_norm_unique" UNIQUE("exercise_name_norm")
);
