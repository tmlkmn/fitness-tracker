const STORAGE_KEY = "fm.workoutPrefs.v1";

export type WorkoutLocation = "gym" | "home";

export interface WorkoutPrefs {
  location: WorkoutLocation;
  equipment: string[];
}

const DEFAULT_PREFS: WorkoutPrefs = { location: "gym", equipment: [] };

export function loadWorkoutPrefs(): WorkoutPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<WorkoutPrefs>;
    const location: WorkoutLocation =
      parsed.location === "home" || parsed.location === "gym" ? parsed.location : "gym";
    const equipment = Array.isArray(parsed.equipment)
      ? parsed.equipment.filter((x): x is string => typeof x === "string")
      : [];
    return { location, equipment };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveWorkoutPrefs(prefs: WorkoutPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage may be unavailable (private mode, quota) — non-fatal
  }
}
