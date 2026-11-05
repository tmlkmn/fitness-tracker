"use server";

import { getExerciseDBList, type ExerciseDBEntry } from "@/lib/exercise-db";

export async function searchExercises(query: string): Promise<ExerciseDBEntry[]> {
  if (!query || query.length < 2) return [];

  const list = await getExerciseDBList();
  const q = query.toLowerCase();

  return list
    .filter((e) => e.name.toLowerCase().includes(q))
    .slice(0, 20);
}
