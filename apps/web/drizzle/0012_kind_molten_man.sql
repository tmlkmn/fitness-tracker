CREATE TABLE "feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"rating" integer,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"admin_response" text,
	"responded_by_admin_id" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_responded_by_admin_id_user_id_fk" FOREIGN KEY ("responded_by_admin_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;