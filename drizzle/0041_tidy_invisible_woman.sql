CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"pdf_url" text,
	"issued_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_provider_check" CHECK ("invoices"."provider" IN ('lemonsqueezy', 'iyzico'))
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"event_name" text,
	"payload" jsonb,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_provider_check" CHECK ("webhook_events"."provider" IN ('lemonsqueezy', 'iyzico'))
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lemonsqueezy_customer_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lemonsqueezy_subscription_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "iyzico_customer_ref" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "iyzico_subscription_ref" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "billing_tier" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "billing_interval" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "billing_provider" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trial_notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "next_billing_date" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "payment_failed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "iyzico_identity_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "billing_address" jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tax_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_provider_ref_idx" ON "invoices" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_external_idx" ON "webhook_events" USING btree ("provider","external_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_subscription_status_check" CHECK ("user"."subscription_status" IS NULL OR "user"."subscription_status" IN ('none', 'trialing', 'active', 'past_due', 'cancelled', 'expired'));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_billing_tier_check" CHECK ("user"."billing_tier" IS NULL OR "user"."billing_tier" IN ('pro', 'elite'));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_billing_interval_check" CHECK ("user"."billing_interval" IS NULL OR "user"."billing_interval" IN ('monthly', 'yearly'));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_billing_provider_check" CHECK ("user"."billing_provider" IS NULL OR "user"."billing_provider" IN ('lemonsqueezy', 'iyzico', 'admin'));