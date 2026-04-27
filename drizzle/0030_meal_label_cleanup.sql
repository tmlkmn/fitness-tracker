-- Data cleanup: normalize meals.meal_label values that are outside the
-- canonical vocabulary so the CHECK constraint added in 0031 can apply
-- without rejection. Each WHEN entry was chosen by inspecting the dirty
-- values present in production (28 distinct disallowed labels) and mapping
-- to the closest canonical bucket.
--
-- Pre/Post-Workout variants → Pre-Workout / Post-Workout
-- "Post-Workout Akşam Yemeği" → Akşam Yemeği (the meal IS dinner; the
-- post-workout aspect was a freeform note, not a slot)
-- Generic "ana öğün" / "öğle" → Öğle Yemeği
-- Late-night variants → Akşam Atıştırması
-- Snack/road/meeting → Ara Öğün
-- Anything not explicitly mapped falls through to "Ara Öğün" (safe default).

UPDATE "meals" SET "meal_label" = CASE "meal_label"
  -- Breakfast
  WHEN '🍳 Kahvaltı' THEN 'Kahvaltı'

  -- Early protein
  WHEN 'Sabah Proteini' THEN 'Erken Protein'

  -- Pre-workout variants
  WHEN 'Pre-Workout Öğünü' THEN 'Pre-Workout'
  WHEN 'Antrenman Öncesi (Pre-Workout)' THEN 'Pre-Workout'
  WHEN '⚡ Antrenman Öncesi' THEN 'Pre-Workout'
  WHEN 'Pre-Swim Öğünü' THEN 'Pre-Workout'
  WHEN 'Yüzme Öncesi' THEN 'Pre-Workout'

  -- Post-workout variants
  WHEN 'Post-Workout – Protein Shake' THEN 'Post-Workout'
  WHEN 'Antrenman Sonrası (Post-Workout)' THEN 'Post-Workout'
  WHEN '💪 Antrenman Sonrası' THEN 'Post-Workout'
  WHEN 'Post-Swim Protein' THEN 'Post-Workout'
  WHEN 'Yüzme Sonrası' THEN 'Post-Workout'

  -- Lunch
  WHEN '🥗 Öğle' THEN 'Öğle Yemeği'
  WHEN '🍗 Ana Öğün' THEN 'Öğle Yemeği'

  -- Dinner
  WHEN '🌙 Akşam' THEN 'Akşam Yemeği'
  WHEN 'Post-Workout Akşam Yemeği' THEN 'Akşam Yemeği'

  -- Late-night
  WHEN 'Gece Öğünü' THEN 'Akşam Atıştırması'
  WHEN 'Gece Protein' THEN 'Akşam Atıştırması'
  WHEN '🌙 Gece' THEN 'Akşam Atıştırması'
  WHEN '🌃 Gece Atıştırması' THEN 'Akşam Atıştırması'

  -- Mid-day snacks → Ara Öğün
  WHEN 'İkindi Atıştırması' THEN 'Ara Öğün'
  WHEN '☕ İkindi' THEN 'Ara Öğün'
  WHEN '🚗 Yolda Dozu' THEN 'Ara Öğün'
  WHEN '🚗 Yolda' THEN 'Ara Öğün'
  WHEN '☕ Toplantı' THEN 'Ara Öğün'
  WHEN '☕ Toplantı Arası' THEN 'Ara Öğün'
  WHEN '🥗 Ara' THEN 'Ara Öğün'
  WHEN '🥗 Ara Öğün' THEN 'Ara Öğün'

  -- Safe fallback for any future stragglers (defensive — current sweep
  -- covers all 28 known dirty groups; this protects against race conditions
  -- where a write between this UPDATE and the constraint creation produces
  -- a new disallowed value)
  ELSE COALESCE(
    CASE
      WHEN "meal_label" IN (
        'Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Ara Öğün',
        'Erken Protein', 'Pre-Workout', 'Post-Workout', 'Akşam Atıştırması'
      ) THEN "meal_label"
      ELSE 'Ara Öğün'
    END,
    'Ara Öğün'
  )
END
WHERE "meal_label" NOT IN (
  'Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Ara Öğün',
  'Erken Protein', 'Pre-Workout', 'Post-Workout', 'Akşam Atıştırması'
);
