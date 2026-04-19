CREATE TABLE "supplement_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplement_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"completion_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "supplement_completions" ADD CONSTRAINT "supplement_completions_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_completions" ADD CONSTRAINT "supplement_completions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplement_completion_unique" ON "supplement_completions" USING btree ("supplement_id","user_id","completion_date");