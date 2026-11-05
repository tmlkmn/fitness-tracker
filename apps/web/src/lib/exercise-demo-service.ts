/**
 * Batch resolver for `exercise_demos` — the taxonomy cache (primary muscles
 * per English exercise name) that the muscle-volume and progressive-overload
 * validators read. A name without a row is simply not counted, and about half
 * of the stored working sets had none, so volume warnings fired on phantom
 * gaps. Before a plan is assessed, every unknown name is matched against
 * free-exercise-db in ONE Haiku call and cached — found or not-found — the
 * same way the demo modal (getExerciseDemo) fills the cache one name at a time.
 *
 * Best-effort: callers wrap it in try/catch; a failure only means the
 * validators see the same partial taxonomy they saw before.
 */

import "server-only";
import { db } from "@/db";
import { exerciseDemos } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getAIClient, AI_MODELS, extractText } from "@/lib/ai";
import { getExerciseDBList, buildExerciseNameList } from "@/lib/exercise-db";
import { parseAiJson } from "@/lib/ai-json-repair";

/** Upper bound per call — a week has ~30 working exercises. */
const MAX_BATCH = 60;
/**
 * The weekly flow runs this once before its 720s AI budget and once after it,
 * inside the route's 800s maxDuration — keep the pair well under that margin.
 * A batch of ~30 names typically returns in a few seconds.
 */
const RESOLVE_TIMEOUT_MS = 20_000;

const BATCH_MATCH_PROMPT = `Sen bir egzersiz veritabanı eşleştirme asistanısın. Kullanıcı mesajında numaralı egzersiz adları, sistem mesajının sonunda "id | ad" satırlarından oluşan bir egzersiz listesi var.

Her aranan ad için listedeki en uygun hareketin id'sini döndür; makul bir karşılık yoksa id olarak "NOT_FOUND" yaz.

Kurallar:
- Adlar İngilizce, Türkçe veya karma olabilir; aynı hareketi farklı isimlerle tanı ("wide-grip lat pulldown" = "Wide-Grip Lat Pulldown").
- Parantez içi açıklamalar varyasyondur; ana hareketi eşleştir.
- Isınma, soğuma ve germe hareketleri de eşleşebilir.
- Kesin olmayan eşleşmede en yakın hareketi seç; tamamen farklı bir hareketi eşleştirme.
- "name" alanına aranan adı aynen yaz.`;

const MATCH_SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, id: { type: "string" } },
        required: ["name", "id"],
        additionalProperties: false,
      },
    },
  },
  required: ["matches"],
  additionalProperties: false,
};

export interface ResolveDemosResult {
  resolved: number;
  notFound: number;
  inputTokens: number;
  outputTokens: number;
}

export async function resolveExerciseDemos(
  englishNames: Iterable<string>,
): Promise<ResolveDemosResult> {
  const empty: ResolveDemosResult = { resolved: 0, notFound: 0, inputTokens: 0, outputTokens: 0 };
  const norms = [...new Set([...englishNames].map((n) => n.toLowerCase().trim()).filter(Boolean))];
  if (norms.length === 0) return empty;

  const cached = await db
    .select({ name: exerciseDemos.exerciseNameNorm })
    .from(exerciseDemos)
    .where(inArray(exerciseDemos.exerciseNameNorm, norms));
  const known = new Set(cached.map((r) => r.name));
  const unknown = norms.filter((n) => !known.has(n)).slice(0, MAX_BATCH);
  if (unknown.length === 0) return empty;

  const list = await getExerciseDBList();
  const byId = new Map(list.map((e) => [e.id, e]));

  // The list is static, so it sits in a cached system block; only the
  // names vary per call. Not logged via logAiUsage: this is a system-side
  // cache fill, and the "exercise-demo" feature would eat the user's quota.
  const message = await getAIClient().messages.create(
    {
      model: AI_MODELS.fast,
      max_tokens: 4000,
      system: [
        { type: "text", text: BATCH_MATCH_PROMPT },
        {
          type: "text",
          text: `Liste:\n${buildExerciseNameList(list)}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        { role: "user", content: unknown.map((n, i) => `${i + 1}. ${n}`).join("\n") },
      ],
      output_config: { format: { type: "json_schema", schema: MATCH_SCHEMA } },
    },
    { signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS) },
  );

  const parsed = parseAiJson(extractText(message.content)) as {
    matches?: { name?: unknown; id?: unknown }[];
  };
  const idByName = new Map<string, string>();
  for (const m of parsed.matches ?? []) {
    if (typeof m.name === "string" && typeof m.id === "string") {
      idByName.set(m.name.toLowerCase().trim(), m.id.trim());
    }
  }

  let resolved = 0;
  let notFound = 0;
  const rows = unknown.map((nameNorm) => {
    const entry = byId.get(idByName.get(nameNorm) ?? "");
    if (!entry) {
      notFound += 1;
      return { exerciseNameNorm: nameNorm, source: "free-exercise-db", notFound: true };
    }
    resolved += 1;
    return {
      exerciseNameNorm: nameNorm,
      externalId: entry.id,
      source: "free-exercise-db",
      images: entry.images,
      primaryMuscles: entry.primaryMuscles,
      secondaryMuscles: entry.secondaryMuscles,
      equipment: entry.equipment ?? null,
      instructions: entry.instructions,
      notFound: false,
    };
  });
  // A concurrent demo-modal lookup may have inserted the same name meanwhile.
  await db.insert(exerciseDemos).values(rows).onConflictDoNothing();

  return {
    resolved,
    notFound,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
