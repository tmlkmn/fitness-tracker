ALTER TABLE "progress_logs" ADD COLUMN "fluid_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "fluid_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "fat_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "fat_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "bmi" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_arm_fat_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_arm_fat_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_arm_muscle_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_arm_muscle_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_arm_fat_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_arm_fat_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_arm_muscle_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_arm_muscle_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "torso_fat_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "torso_fat_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "torso_muscle_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "torso_muscle_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_leg_fat_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_leg_fat_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_leg_muscle_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_leg_muscle_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_leg_fat_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_leg_fat_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_leg_muscle_percent" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_leg_muscle_kg" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_arm_cm" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_arm_cm" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "right_leg_cm" numeric;--> statement-breakpoint
ALTER TABLE "progress_logs" ADD COLUMN "left_leg_cm" numeric;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "must_change_password" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "invite_expires_at" timestamp;