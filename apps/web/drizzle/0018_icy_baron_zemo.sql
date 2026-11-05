CREATE TABLE "sleep_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"log_date" date NOT NULL,
	"bedtime" text NOT NULL,
	"wake_time" text NOT NULL,
	"duration_minutes" integer,
	"quality" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"log_date" date NOT NULL,
	"glasses" integer DEFAULT 0 NOT NULL,
	"target_glasses" integer DEFAULT 8 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sleep_log_user_date_idx" ON "sleep_logs" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE UNIQUE INDEX "water_log_user_date_idx" ON "water_logs" USING btree ("user_id","log_date");