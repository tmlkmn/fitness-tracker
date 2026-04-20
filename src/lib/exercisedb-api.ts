const EXERCISEDB_BASE = "https://exercisedb.p.rapidapi.com";
const EXERCISEDB_HOST = "exercisedb.p.rapidapi.com";

export interface ExerciseDBResult {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  gifUrl: string;
  instructions: string[];
  secondaryMuscles: string[];
}

function getApiKey(): string | null {
  return process.env.EXERCISEDB_API_KEY ?? null;
}

/**
 * Search ExerciseDB API by exercise name.
 * Returns the best match or null if not found / API unavailable.
 */
export async function searchExerciseDB(
  name: string,
): Promise<ExerciseDBResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const encoded = encodeURIComponent(name.toLowerCase().trim());
  const url = `${EXERCISEDB_BASE}/exercises/name/${encoded}?limit=5`;

  try {
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": EXERCISEDB_HOST,
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as ExerciseDBResult[];
    if (!Array.isArray(data) || data.length === 0) return null;

    return data[0];
  } catch {
    return null;
  }
}
