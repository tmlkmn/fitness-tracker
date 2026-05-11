CREATE TABLE "daily_greetings" (
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"locale" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_greetings_user_id_date_locale_pk" PRIMARY KEY("user_id","date","locale"),
	CONSTRAINT "daily_greetings_locale_check" CHECK ("daily_greetings"."locale" IN ('tr', 'en'))
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "in_app_enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "email_enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "push_enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "daily_greetings" ADD CONSTRAINT "daily_greetings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;