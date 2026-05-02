"use server";

import { db } from "@/db";
import { users, progressLogs } from "@/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import {
  getAIClient,
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { MACRO_CALC_PROMPT } from "@/lib/ai-prompts";
import type { MacroTargets } from "@/lib/macro-targets";

export interface AIMacroResult {
  macros: MacroTargets;
  explanation: string;
}

const FITNESS_GOAL_TR: Record<string, string> = {
  loss: "Yağ kaybı",
  recomp: "Rekomposizyon (yağ kaybı + kas)",
  maintain: "İdame",
  muscle_gain: "Kas kazanımı",
  weight_gain: "Kilo alma",
};

const ACTIVITY_TR: Record<string, string> = {
  sedentary: "Hareketsiz (masa başı)",
  light: "Hafif aktif (haftada 1-3 gün)",
  moderate: "Orta aktif (haftada 3-5 gün)",
  very_active: "Çok aktif (haftada 6-7 gün)",
};

const GENDER_TR: Record<string, string> = {
  male: "Erkek",
  female: "Kadın",
  prefer_not_to_say: "Belirtilmedi",
};

function fmt(val: unknown): string {
  if (val == null) return "—";
  const n = parseFloat(String(val));
  return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : "—";
}

function buildProfileBlock(profile: {
  weight: string | null;
  targetWeight: string | null;
  height: number | null;
  age: number | null;
  gender: string | null;
  dailyActivityLevel: string | null;
  fitnessGoal: string | null;
  hasEatingDisorderHistory: boolean | null;
  isPregnantOrBreastfeeding: boolean | null;
  hasDiabetes: boolean | null;
  hasThyroidCondition: boolean | null;
}): string {
  const lines = [
    `Kilo: ${fmt(profile.weight)} kg`,
    `Hedef Kilo: ${fmt(profile.targetWeight)} kg`,
    `Boy: ${profile.height ?? "—"} cm`,
    `Yaş: ${profile.age ?? "—"}`,
    `Cinsiyet: ${GENDER_TR[profile.gender ?? ""] ?? "Belirtilmedi"}`,
    `Aktivite: ${ACTIVITY_TR[profile.dailyActivityLevel ?? ""] ?? "Bilinmiyor"}`,
    `Hedef: ${FITNESS_GOAL_TR[profile.fitnessGoal ?? ""] ?? "Belirtilmedi"}`,
  ];

  const flags: string[] = [];
  if (profile.hasDiabetes) flags.push("Diyabet");
  if (profile.hasThyroidCondition) flags.push("Tiroid bozukluğu");
  if (profile.isPregnantOrBreastfeeding) flags.push("Gebe/emziriyor");
  if (profile.hasEatingDisorderHistory) flags.push("Yeme bozukluğu geçmişi");
  if (flags.length) lines.push(`Sağlık Notları: ${flags.join(", ")}`);

  return `## Kullanıcı Profili\n${lines.join("\n")}`;
}

function buildMeasurementBlock(log: {
  logDate: string;
  weight: string | null;
  fatPercent: string | null;
  fatKg: string | null;
  bmi: string | null;
  leftArmFatPercent: string | null;
  leftArmMusclePercent: string | null;
  leftArmMuscleKg: string | null;
  rightArmFatPercent: string | null;
  rightArmMusclePercent: string | null;
  rightArmMuscleKg: string | null;
  torsoFatPercent: string | null;
  torsoMusclePercent: string | null;
  torsoMuscleKg: string | null;
  leftLegFatPercent: string | null;
  leftLegMusclePercent: string | null;
  leftLegMuscleKg: string | null;
  rightLegFatPercent: string | null;
  rightLegMusclePercent: string | null;
  rightLegMuscleKg: string | null;
  waistCm: string | null;
  rightArmCm: string | null;
  leftArmCm: string | null;
  rightLegCm: string | null;
  leftLegCm: string | null;
} | null): string {
  if (!log) return "## Son Ölçüm\nÖlçüm kaydı bulunamadı.";

  const lines = [
    `Ölçüm Tarihi: ${log.logDate}`,
    `Ağırlık: ${fmt(log.weight)} kg | Yağ%: ${fmt(log.fatPercent)}% | Yağ kg: ${fmt(log.fatKg)} kg | BMI: ${fmt(log.bmi)}`,
    "",
    "Bölgesel Bileşim:",
    `  Sol Kol   — Yağ: ${fmt(log.leftArmFatPercent)}%  Kas: ${fmt(log.leftArmMusclePercent)}% (${fmt(log.leftArmMuscleKg)} kg)`,
    `  Sağ Kol   — Yağ: ${fmt(log.rightArmFatPercent)}%  Kas: ${fmt(log.rightArmMusclePercent)}% (${fmt(log.rightArmMuscleKg)} kg)`,
    `  Gövde     — Yağ: ${fmt(log.torsoFatPercent)}%  Kas: ${fmt(log.torsoMusclePercent)}% (${fmt(log.torsoMuscleKg)} kg)`,
    `  Sol Bacak — Yağ: ${fmt(log.leftLegFatPercent)}%  Kas: ${fmt(log.leftLegMusclePercent)}% (${fmt(log.leftLegMuscleKg)} kg)`,
    `  Sağ Bacak — Yağ: ${fmt(log.rightLegFatPercent)}%  Kas: ${fmt(log.rightLegMusclePercent)}% (${fmt(log.rightLegMuscleKg)} kg)`,
  ];

  const hasCm =
    log.waistCm || log.rightArmCm || log.leftArmCm || log.rightLegCm || log.leftLegCm;
  if (hasCm) {
    lines.push("");
    lines.push("Çevre Ölçüleri (cm):");
    if (log.waistCm) lines.push(`  Bel: ${fmt(log.waistCm)} cm`);
    if (log.rightArmCm || log.leftArmCm)
      lines.push(`  Kol: sağ ${fmt(log.rightArmCm)} / sol ${fmt(log.leftArmCm)} cm`);
    if (log.rightLegCm || log.leftLegCm)
      lines.push(`  Bacak: sağ ${fmt(log.rightLegCm)} / sol ${fmt(log.leftLegCm)} cm`);
  }

  return `## Son Ölçüm\n${lines.join("\n")}`;
}

export async function generateAIMacroTargets(
  bodyDescription: string,
): Promise<AIMacroResult> {
  const trimmed = bodyDescription.trim();
  if (trimmed.length < 20) {
    throw new Error("Lütfen en az 20 karakter açıklama gir.");
  }
  if (trimmed.length > 600) {
    throw new Error("Açıklama en fazla 600 karakter olabilir.");
  }

  const user = await getAuthUser();
  await checkRateLimit(user.id, "macro-ai");

  const [profile] = await db
    .select({
      weight: users.weight,
      targetWeight: users.targetWeight,
      height: users.height,
      age: users.age,
      gender: users.gender,
      dailyActivityLevel: users.dailyActivityLevel,
      fitnessGoal: users.fitnessGoal,
      hasEatingDisorderHistory: users.hasEatingDisorderHistory,
      isPregnantOrBreastfeeding: users.isPregnantOrBreastfeeding,
      hasDiabetes: users.hasDiabetes,
      hasThyroidCondition: users.hasThyroidCondition,
    })
    .from(users)
    .where(eq(users.id, user.id));

  const [latestLog] = await db
    .select({
      logDate: progressLogs.logDate,
      weight: progressLogs.weight,
      fatPercent: progressLogs.fatPercent,
      fatKg: progressLogs.fatKg,
      bmi: progressLogs.bmi,
      leftArmFatPercent: progressLogs.leftArmFatPercent,
      leftArmMusclePercent: progressLogs.leftArmMusclePercent,
      leftArmMuscleKg: progressLogs.leftArmMuscleKg,
      rightArmFatPercent: progressLogs.rightArmFatPercent,
      rightArmMusclePercent: progressLogs.rightArmMusclePercent,
      rightArmMuscleKg: progressLogs.rightArmMuscleKg,
      torsoFatPercent: progressLogs.torsoFatPercent,
      torsoMusclePercent: progressLogs.torsoMusclePercent,
      torsoMuscleKg: progressLogs.torsoMuscleKg,
      leftLegFatPercent: progressLogs.leftLegFatPercent,
      leftLegMusclePercent: progressLogs.leftLegMusclePercent,
      leftLegMuscleKg: progressLogs.leftLegMuscleKg,
      rightLegFatPercent: progressLogs.rightLegFatPercent,
      rightLegMusclePercent: progressLogs.rightLegMusclePercent,
      rightLegMuscleKg: progressLogs.rightLegMuscleKg,
      waistCm: progressLogs.waistCm,
      rightArmCm: progressLogs.rightArmCm,
      leftArmCm: progressLogs.leftArmCm,
      rightLegCm: progressLogs.rightLegCm,
      leftLegCm: progressLogs.leftLegCm,
    })
    .from(progressLogs)
    .where(eq(progressLogs.userId, user.id))
    .orderBy(desc(progressLogs.logDate))
    .limit(1);

  const profileBlock = buildProfileBlock(profile ?? {
    weight: null, targetWeight: null, height: null, age: null,
    gender: null, dailyActivityLevel: null, fitnessGoal: null,
    hasEatingDisorderHistory: false, isPregnantOrBreastfeeding: false,
    hasDiabetes: false, hasThyroidCondition: false,
  });

  const measurementBlock = buildMeasurementBlock(latestLog ?? null);

  const userMessage = [
    profileBlock,
    "",
    measurementBlock,
    "",
    "## Kullanıcının Vücut Gözlemleri",
    trimmed,
    "",
    "Yukarıdaki tüm bilgilere dayanarak günlük makro hedeflerimi hesapla. Sadece JSON formatında yanıt ver.",
  ].join("\n");

  const client = getAIClient();
  const startTime = Date.now();

  let rawText = "";
  try {
    const msg = await client.messages.create({
      model: AI_MODELS.smart,
      max_tokens: 256,
      system: [
        {
          type: "text",
          text: MACRO_CALC_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    rawText = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // JSON parse — strip possible markdown fences
    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const calories = Math.round(Number(parsed.calories));
    const protein = Math.round(Number(parsed.protein));
    const carbs = Math.round(Number(parsed.carbs));
    const fat = Math.round(Number(parsed.fat));
    const explanation = String(parsed.explanation ?? "").slice(0, 150);

    if (!calories || !protein || !carbs || !fat) {
      throw new Error("Geçersiz makro değerleri: " + jsonStr);
    }
    if (calories < 1200) {
      throw new Error("AI geçersiz kalori döndürdü: " + calories);
    }

    await logAiUsage(user.id, "macro-ai", {
      status: "success",
      inputTokens: msg.usage.input_tokens,
      outputTokens: msg.usage.output_tokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return {
      macros: { calories, protein, carbs, fat },
      explanation,
    };
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "macro-ai", {
      status,
      errorMessage,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    if (error instanceof Error && (error.message.startsWith("COOLDOWN") || error.message === "RATE_LIMITED")) {
      throw error;
    }
    throw new Error("AI_UNAVAILABLE");
  }
}
