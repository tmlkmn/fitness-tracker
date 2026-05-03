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
  gifUrl: string | null;
  videoUrl: string | null;
  images: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  instructions: string[];
  overview: string | null;
  tips: string[];
}

const NOT_FOUND_RESULT: ExerciseDemoResult = {
  found: false,
  gifUrl: null,
  videoUrl: null,
  images: [],
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: null,
  instructions: [],
  overview: null,
  tips: [],
};

function toResult(
  row: {
    gifUrl: string | null;
    videoUrl: string | null;
    images: unknown;
    primaryMuscles: unknown;
    secondaryMuscles: unknown;
    equipment: string | null;
    instructions: unknown;
    overview: string | null;
    tips: unknown;
    notFound: boolean | null;
  },
): ExerciseDemoResult {
  if (row.notFound) return NOT_FOUND_RESULT;

  const images = (row.images as string[] | null) ?? [];
  return {
    found: true,
    gifUrl: row.gifUrl ?? null,
    videoUrl: row.videoUrl ?? null,
    images: images.map(getImageUrl),
    primaryMuscles: (row.primaryMuscles as string[] | null) ?? [],
    secondaryMuscles: (row.secondaryMuscles as string[] | null) ?? [],
    equipment: row.equipment,
    instructions: (row.instructions as string[] | null) ?? [],
    overview: row.overview ?? null,
    tips: (row.tips as string[] | null) ?? [],
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
      gifUrl: exerciseDemos.gifUrl,
      videoUrl: exerciseDemos.videoUrl,
      images: exerciseDemos.images,
      primaryMuscles: exerciseDemos.primaryMuscles,
      secondaryMuscles: exerciseDemos.secondaryMuscles,
      equipment: exerciseDemos.equipment,
      instructions: exerciseDemos.instructions,
      overview: exerciseDemos.overview,
      tips: exerciseDemos.tips,
      notFound: exerciseDemos.notFound,
    })
    .from(exerciseDemos)
    .where(eq(exerciseDemos.exerciseNameNorm, nameNorm));

  if (existing) return toResult(existing);

  // 2. AI matching with free-exercise-db
  await checkRateLimit(user.id, "exercise-demo");
  await logAiUsage(user.id, "exercise-demo");

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

  if (aiResponse === "NOT_FOUND" || !aiResponse) {
    await db.insert(exerciseDemos).values({
      exerciseNameNorm: nameNorm,
      source: "free-exercise-db",
      notFound: true,
    });
    return NOT_FOUND_RESULT;
  }

  const matchedId = aiResponse.trim();
  const matched: ExerciseDBEntry | undefined = exerciseList.find(
    (e) => e.id === matchedId,
  );

  if (!matched) {
    await db.insert(exerciseDemos).values({
      exerciseNameNorm: nameNorm,
      source: "free-exercise-db",
      notFound: true,
    });
    return NOT_FOUND_RESULT;
  }

  await db.insert(exerciseDemos).values({
    exerciseNameNorm: nameNorm,
    externalId: matched.id,
    source: "free-exercise-db",
    images: matched.images,
    primaryMuscles: matched.primaryMuscles,
    secondaryMuscles: matched.secondaryMuscles,
    equipment: matched.equipment ?? null,
    instructions: matched.instructions,
    notFound: false,
  });

  return {
    found: true,
    gifUrl: null,
    videoUrl: null,
    images: matched.images.map(getImageUrl),
    primaryMuscles: matched.primaryMuscles,
    secondaryMuscles: matched.secondaryMuscles,
    equipment: matched.equipment ?? null,
    instructions: matched.instructions,
    overview: null,
    tips: [],
  };
}
