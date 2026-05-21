ALTER TABLE "webhook_events" ADD COLUMN "succeeded_at" timestamp;
--> statement-breakpoint
-- Backfill: existing rows predate the two-phase handler and should be treated
-- as fully succeeded. Without this, replays of any historical event would
-- re-trigger side effects (re-update users, re-notify).
UPDATE "webhook_events" SET "succeeded_at" = "processed_at" WHERE "succeeded_at" IS NULL;
