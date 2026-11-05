CREATE TABLE "readiness_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"log_date" date NOT NULL,
	"energy_rating" integer,
	"pain_score" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "readiness_energy_check" CHECK ("readiness_logs"."energy_rating" IS NULL OR ("readiness_logs"."energy_rating" >= 1 AND "readiness_logs"."energy_rating" <= 5)),
	CONSTRAINT "readiness_pain_check" CHECK ("readiness_logs"."pain_score" IS NULL OR ("readiness_logs"."pain_score" >= 1 AND "readiness_logs"."pain_score" <= 5))
);
--> statement-breakpoint
ALTER TABLE "readiness_logs" ADD CONSTRAINT "readiness_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "readiness_log_user_date_idx" ON "readiness_logs" USING btree ("user_id","log_date");