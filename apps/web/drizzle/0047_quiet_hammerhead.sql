CREATE TABLE "expo_push_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expo_push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "expo_push_tokens_token_unique" UNIQUE("token"),
	CONSTRAINT "expo_push_tokens_platform_check" CHECK ("expo_push_tokens"."platform" IN ('ios', 'android'))
);
--> statement-breakpoint
ALTER TABLE "expo_push_tickets" ADD CONSTRAINT "expo_push_tickets_token_expo_push_tokens_token_fk" FOREIGN KEY ("token") REFERENCES "public"."expo_push_tokens"("token") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expo_push_tokens" ADD CONSTRAINT "expo_push_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expo_push_tickets_created_idx" ON "expo_push_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "expo_push_tokens_user_idx" ON "expo_push_tokens" USING btree ("user_id");