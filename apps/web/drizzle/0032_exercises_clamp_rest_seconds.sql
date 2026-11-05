-- Data cleanup: clamp out-of-range restSeconds values into the [30, 300]
-- range so the CHECK constraint added in 0033 can apply without rejection.
-- Production scan found 35 rows with restSeconds < 30 (mostly 15-25s) — too
-- short for proper recovery. Clamp to 30s (lower bound of the new constraint).
-- No rows currently exceed 300, but the upper-clamp is included defensively
-- to cover any race-condition writes between this UPDATE and the constraint.

UPDATE "exercises"
SET "rest_seconds" = LEAST(GREATEST("rest_seconds", 30), 300)
WHERE "rest_seconds" IS NOT NULL
  AND ("rest_seconds" < 30 OR "rest_seconds" > 300);
--> statement-breakpoint

-- durationMinutes is already clean (1..90), but the same defensive clamp
-- is applied for parity in case future writes race the 0033 constraint.
UPDATE "exercises"
SET "duration_minutes" = LEAST(GREATEST("duration_minutes", 1), 90)
WHERE "duration_minutes" IS NOT NULL
  AND ("duration_minutes" < 1 OR "duration_minutes" > 90);
