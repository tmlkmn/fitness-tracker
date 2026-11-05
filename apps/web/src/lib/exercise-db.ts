const EXERCISES_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

export const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export interface ExerciseDBEntry {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  instructions: string[];
  images: string[];
}

let cachedList: ExerciseDBEntry[] | null = null;

export async function getExerciseDBList(): Promise<ExerciseDBEntry[]> {
  if (cachedList) return cachedList;

  const res = await fetch(EXERCISES_URL);
  if (!res.ok) throw new Error("Failed to fetch exercise database");

  const data = (await res.json()) as ExerciseDBEntry[];
  cachedList = data;
  return data;
}

export function getImageUrl(relativePath: string): string {
  return `${IMAGE_BASE}${relativePath}`;
}

/**
 * Build a compact name list for AI matching prompt.
 * Format: "ID | Name" per line, truncated to fit within token limits.
 */
export function buildExerciseNameList(list: ExerciseDBEntry[]): string {
  return list.map((e) => `${e.id} | ${e.name}`).join("\n");
}
