"use server";

import { db } from "@/db";
import { exerciseDemos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit, logAiUsage } from "@/lib/ai";
import { EXERCISE_MATCH_PROMPT } from "@/lib/ai-prompts";
import {
  getExerciseDBList,
  getImageUrl,
  buildExerciseNameList,
  type ExerciseDBEntry,
} from "@/lib/exercise-db";

export interface ExerciseDemoResult {
  found: boolean;
  images: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  instructions: string[];
}

const NOT_FOUND_RESULT: ExerciseDemoResult = {
  found: false,
  images: [],
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: null,
  instructions: [],
};

function toResult(
  row: {
    images: unknown;
    primaryMuscles: unknown;
    secondaryMuscles: unknown;
    equipment: string | null;
    instructions: unknown;
    notFound: boolean | null;
  },
): ExerciseDemoResult {
  if (row.notFound) return NOT_FOUND_RESULT;

  const images = (row.images as string[] | null) ?? [];
  return {
    found: true,
    images: images.map(getImageUrl),
    primaryMuscles: (row.primaryMuscles as string[] | null) ?? [],
    secondaryMuscles: (row.secondaryMuscles as string[] | null) ?? [],
    equipment: row.equipment,
    instructions: (row.instructions as string[] | null) ?? [],
  };
}

export async function getExerciseDemo(
  exerciseName: string,
): Promise<ExerciseDemoResult> {
  const user = await getAuthUser();
  const nameNorm = exerciseName.toLowerCase().trim();

  // 1. Check DB cache
  const [existing] = await db
    .select({
      images: exerciseDemos.images,
      primaryMuscles: exerciseDemos.primaryMuscles,
      secondaryMuscles: exerciseDemos.secondaryMuscles,
      equipment: exerciseDemos.equipment,
      instructions: exerciseDemos.instructions,
      notFound: exerciseDemos.notFound,
    })
    .from(exerciseDemos)
    .where(eq(exerciseDemos.exerciseNameNorm, nameNorm));

  if (existing) return toResult(existing);

  // 2. Rate limit before AI call
  await checkRateLimit(user.id, "exercise-demo");
  await logAiUsage(user.id, "exercise-demo");

  // 3. Fetch exercise database + AI matching
  const exerciseList = await getExerciseDBList();
  const nameList = buildExerciseNameList(exerciseList);

  const client = getAIClient();
  const message = await client.messages.create({
    model: AI_MODELS.fast,
    max_tokens: 100,
    system: [
      {
        type: "text",
        text: EXERCISE_MATCH_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Egzersiz adı: "${exerciseName}"\n\nEgzersiz listesi:\n${nameList}`,
      },
    ],
  });

  const aiResponse =
    (message.content[0].type === "text" ? message.content[0].text : "")
      .trim();

  // 4. Find the matched exercise
  if (aiResponse === "NOT_FOUND" || !aiResponse) {
    await db.insert(exerciseDemos).values({
      exerciseNameNorm: nameNorm,
      notFound: true,
    });
    return NOT_FOUND_RESULT;
  }

  const matchedId = aiResponse.trim();
  const matched: ExerciseDBEntry | undefined = exerciseList.find(
    (e) => e.id === matchedId,
  );

  if (!matched) {
    // AI returned an ID that doesn't exist — mark as not found
    await db.insert(exerciseDemos).values({
      exerciseNameNorm: nameNorm,
      notFound: true,
    });
    return NOT_FOUND_RESULT;
  }

  // 5. Save to DB
  await db.insert(exerciseDemos).values({
    exerciseNameNorm: nameNorm,
    externalId: matched.id,
    images: matched.images,
    primaryMuscles: matched.primaryMuscles,
    secondaryMuscles: matched.secondaryMuscles,
    equipment: matched.equipment ?? null,
    instructions: matched.instructions,
    notFound: false,
  });

  return {
    found: true,
    images: matched.images.map(getImageUrl),
    primaryMuscles: matched.primaryMuscles,
    secondaryMuscles: matched.secondaryMuscles,
    equipment: matched.equipment ?? null,
    instructions: matched.instructions,
  };
}
