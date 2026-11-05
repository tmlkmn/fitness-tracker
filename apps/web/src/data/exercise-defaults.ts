/**
 * Default sets/reps/rest for exercise types based on equipment and muscle group patterns.
 */

interface ExerciseDefaults {
  sets: number;
  reps: string;
  restSeconds: number;
  durationMinutes?: number;
}

const COMPOUND_BARBELL = ["squat", "bench press", "deadlift", "overhead press", "barbell row", "clean", "snatch", "front squat"];
const CARDIO_KEYWORDS = ["run", "jog", "bike", "cycling", "rowing", "treadmill", "elliptical", "stair"];
const SWIMMING_KEYWORDS = ["swim", "freestyle", "backstroke", "breaststroke"];
const STRETCH_KEYWORDS = ["stretch", "yoga", "foam roll", "mobility"];

export function getExerciseDefaults(name: string, equipment?: string | null): ExerciseDefaults {
  const lower = name.toLowerCase();

  // Cardio
  if (CARDIO_KEYWORDS.some((k) => lower.includes(k))) {
    return { sets: 1, reps: "—", restSeconds: 0, durationMinutes: 20 };
  }

  // Swimming
  if (SWIMMING_KEYWORDS.some((k) => lower.includes(k))) {
    return { sets: 1, reps: "—", restSeconds: 0, durationMinutes: 20 };
  }

  // Stretch / mobility
  if (STRETCH_KEYWORDS.some((k) => lower.includes(k))) {
    return { sets: 1, reps: "30sn", restSeconds: 0, durationMinutes: 5 };
  }

  // Compound barbell
  if (COMPOUND_BARBELL.some((k) => lower.includes(k)) || equipment === "barbell") {
    return { sets: 4, reps: "8-10", restSeconds: 90 };
  }

  // Bodyweight
  if (equipment === "body only" || equipment === "body weight") {
    return { sets: 3, reps: "12-15", restSeconds: 45 };
  }

  // Default (dumbbell, cable, machine, etc.)
  return { sets: 3, reps: "10-12", restSeconds: 60 };
}
