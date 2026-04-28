import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, weeklyPlans } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  getAIClient,
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  buildUserNotePriorityBlock,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { WEEKLY_PLAN_PROMPT, NUTRITION_ONLY_WEEKLY_PROMPT, WORKOUT_ONLY_WEEKLY_PROMPT } from "@/lib/ai-prompts";
import { buildWeeklyPlanContext } from "@/actions/ai-weekly";
import { saveAiSuggestion } from "@/actions/ai-suggestions";
import {
  validateWeeklyPlan,
  type ExpectedTargets,
  type DayModeChoice,
  type ValidateWeeklyPlanResult,
} from "@/lib/ai-weekly-types";
import { resolveTargets, type MacroTargets } from "@/lib/macro-targets";

export const maxDuration = 180;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMondayStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseJSON(text: string): unknown {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // Fix single-quoted strings → double-quoted
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');
  cleaned = cleaned.replace(/'([^']*)'(?=\s*[:,\]}])/g, '"$1"');

  return JSON.parse(cleaned);
}

/**
 * Attempt to repair truncated JSON by closing open brackets/braces.
 * Returns the repaired string, or throws if unfixable.
 */
function repairTruncatedJson(text: string): string {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Fix trailing commas
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // Remove trailing incomplete key-value (e.g. `"key": "incom`)
  cleaned = cleaned.replace(/,?\s*"[^"]*"?\s*:\s*"?[^"]*$/, "");
  // Remove trailing incomplete object start (e.g. `, {`)
  cleaned = cleaned.replace(/,?\s*\{[^}]*$/, "");

  // Count open brackets and close them
  const opens: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of cleaned) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") opens.push(ch);
    if (ch === "}" || ch === "]") opens.pop();
  }

  // If we're inside a string, close it
  if (inString) cleaned += '"';

  // Close all open brackets in reverse order
  while (opens.length > 0) {
    const open = opens.pop()!;
    cleaned += open === "{" ? "}" : "]";
  }

  return cleaned;
}

const TURKISH_DAY_NAMES = [
  "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
] as const;

/**
 * Build the GÜNLÜK PLAN TİPLERİ block injected into user message so the AI
 * has a concrete per-day contract to honor.
 */
function buildDayModesBlock(
  dayModes: Partial<Record<number, DayModeChoice>>,
): string {
  const lines = TURKISH_DAY_NAMES.map((name, dow) => {
    const mode = dayModes[dow] ?? "rest";
    return `  ${name}: ${mode}`;
  });
  return `\n\n═══ GÜNLÜK PLAN TİPLERİ (KRİTİK — birebir uygula) ═══
${lines.join("\n")}
HER GÜN için planType yukarıdaki listeyle BİREBİR aynı olmalı. workout/swimming için exercises dolu, rest için exercises boş array. Beslenme programı (meals) HER GÜN için DOLU olmalı — rest günleri DAHİL.`;
}

/**
 * Detect whether validator results need a content-quality retry. Triggers:
 * - missing days (AI returned <7 → validator filled with empty rest)
 * - planType mismatches (AI ignored user's day mode selection)
 * - empty meal days (any day with meals.length === 0)
 */
function needsContentRetry(result: ValidateWeeklyPlanResult): boolean {
  return (
    result.missingDays.length > 0 ||
    result.planTypeMismatches.length > 0 ||
    result.emptyMealDays.length > 0
  );
}

function buildRetryNudge(result: ValidateWeeklyPlanResult): string {
  const issues: string[] = [];
  if (result.missingDays.length > 0) {
    const names = result.missingDays.map((d) => TURKISH_DAY_NAMES[d]).join(", ");
    issues.push(`EKSİK GÜNLER: ${names}. Bu günler için TAM içerik üret (planType + meals + exercises).`);
  }
  if (result.planTypeMismatches.length > 0) {
    const names = result.planTypeMismatches.map((d) => TURKISH_DAY_NAMES[d]).join(", ");
    issues.push(`YANLIŞ planType GÜNLERİ: ${names}. Bu günlerde GÜNLÜK PLAN TİPLERİ bloğundaki tipi BİREBİR uygula.`);
  }
  if (result.emptyMealDays.length > 0) {
    const names = result.emptyMealDays.map((d) => TURKISH_DAY_NAMES[d]).join(", ");
    issues.push(`MEAL'i BOŞ GÜNLER: ${names}. Bu günlere MUTLAKA 3-5 öğün ekle (rest günleri dahil).`);
  }
  return `\n\nÖNCEKİ YANITINDA ŞU SORUNLAR VAR — DÜZELT:\n${issues.join("\n")}\nTüm 7 günü içeren EKSİKSİZ ve TUTARLI bir JSON döndür.`;
}

// ─── POST handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Parse body
  let dateStr: string;
  let userNote: string | undefined;
  let generateMode: "both" | "nutrition" | "workout" | undefined;
  let dayModesInput: Partial<Record<number, DayModeChoice>> | undefined;
  try {
    const body = await request.json();
    dateStr = String(body.dateStr ?? "");
    userNote = body.userNote ? String(body.userNote) : undefined;
    generateMode = body.generateMode;
    if (body.dayModes && typeof body.dayModes === "object") {
      const allowed: DayModeChoice[] = ["workout", "swimming", "rest", "nutrition"];
      const parsed: Partial<Record<number, DayModeChoice>> = {};
      for (const [k, v] of Object.entries(body.dayModes as Record<string, unknown>)) {
        const dow = Number(k);
        if (Number.isInteger(dow) && dow >= 0 && dow <= 6 && allowed.includes(v as DayModeChoice)) {
          parsed[dow] = v as DayModeChoice;
        }
      }
      if (Object.keys(parsed).length > 0) dayModesInput = parsed;
    }
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!dateStr) {
    return Response.json({ error: "Tarih gerekli." }, { status: 400 });
  }

  // Rate limit
  try {
    await checkRateLimit(userId, "weekly");
  } catch (err) {
    const msg = err instanceof Error && err.message.startsWith("COOLDOWN:")
      ? `Lütfen ${err.message.split(":")[1]} saniye bekleyin.`
      : "Günlük haftalık plan limitine ulaştınız (max 2/gün).";
    return Response.json({ error: msg }, { status: 429 });
  }

  // Load full user profile for both prompt selection and target computation.
  const [userRow] = await db
    .select({
      serviceType: users.serviceType,
      weight: users.weight,
      targetWeight: users.targetWeight,
      height: users.height,
      age: users.age,
      gender: users.gender,
      dailyActivityLevel: users.dailyActivityLevel,
      fitnessGoal: users.fitnessGoal,
      targetCalories: users.targetCalories,
      targetProteinG: users.targetProteinG,
      targetCarbsG: users.targetCarbsG,
      targetFatG: users.targetFatG,
    })
    .from(users)
    .where(eq(users.id, userId));
  const isNutritionOnly = userRow?.serviceType === "nutrition";

  // Select prompt
  let systemPrompt: string;
  if (generateMode === "nutrition") {
    systemPrompt = NUTRITION_ONLY_WEEKLY_PROMPT;
  } else if (generateMode === "workout") {
    systemPrompt = WORKOUT_ONLY_WEEKLY_PROMPT;
  } else if (isNutritionOnly) {
    systemPrompt = NUTRITION_ONLY_WEEKLY_PROMPT;
  } else {
    systemPrompt = WEEKLY_PLAN_PROMPT;
  }

  const monday = getMondayStr(dateStr);
  const weeklyContext = await buildWeeklyPlanContext(userId);

  // Determine the correct week number for this Monday:
  // - If a plan already exists for this Monday → reuse its weekNumber
  // - Otherwise → max(weekNumber) + 1
  const [existingForMonday] = await db
    .select({ weekNumber: weeklyPlans.weekNumber })
    .from(weeklyPlans)
    .where(and(eq(weeklyPlans.userId, userId), eq(weeklyPlans.startDate, monday)));
  let nextWeekNumber: number;
  if (existingForMonday) {
    nextWeekNumber = existingForMonday.weekNumber;
  } else {
    const [maxRow] = await db
      .select({ max: sql<number>`coalesce(max(${weeklyPlans.weekNumber}), 0)` })
      .from(weeklyPlans)
      .where(eq(weeklyPlans.userId, userId));
    nextWeekNumber = (maxRow?.max ?? 0) + 1;
  }

  // Compute resolved macro targets and inject when this run includes nutrition.
  let targetsBlock = "";
  let resolvedTargets: MacroTargets | null = null;
  const includeNutrition = generateMode !== "workout";
  if (includeNutrition && userRow) {
    resolvedTargets = await resolveTargets(userRow, userId);
    if (resolvedTargets) {
      targetsBlock = `\n\n═══ HESAPLANMIŞ GÜNLÜK MAKRO HEDEFLERİ ═══
Kalori: ${resolvedTargets.calories} kcal
Protein: ${resolvedTargets.protein}g
Karbonhidrat: ${resolvedTargets.carbs}g
Yağ: ${resolvedTargets.fat}g
Bu hedefler kullanıcının cinsiyet, yaş, kilo, boy, aktivite seviyesi ve fitness hedefine göre Mifflin-St Jeor + LBM bazlı hesaplanmıştır. Beslenme programı bu hedeflere ±%5 toleransla uymalı.`;
    }
  }

  // Pass to validator so weekly-average calorie drift can be flagged.
  const expectedTargets: ExpectedTargets | undefined = resolvedTargets
    ? {
        calories: resolvedTargets.calories,
        protein: resolvedTargets.protein,
        carbs: resolvedTargets.carbs,
        fat: resolvedTargets.fat,
      }
    : undefined;

  // Resolve dayModes: explicit body input wins; nutrition-only defaults all
  // 7 days to "nutrition"; otherwise default Pzt-Cum workout, Cmt-Paz rest.
  let expectedDayModes: Partial<Record<number, DayModeChoice>>;
  if (dayModesInput) {
    expectedDayModes = dayModesInput;
  } else if (generateMode === "nutrition" || (isNutritionOnly && generateMode !== "workout")) {
    expectedDayModes = { 0: "nutrition", 1: "nutrition", 2: "nutrition", 3: "nutrition", 4: "nutrition", 5: "nutrition", 6: "nutrition" };
  } else {
    expectedDayModes = { 0: "workout", 1: "workout", 2: "workout", 3: "workout", 4: "workout", 5: "rest", 6: "rest" };
  }
  // Nutrition-only mode never uses workout/swimming — coerce to "nutrition".
  if (generateMode === "nutrition" || (isNutritionOnly && generateMode !== "workout")) {
    for (let i = 0; i < 7; i++) expectedDayModes[i] = "nutrition";
  }
  const dayModesBlock = buildDayModesBlock(expectedDayModes);

  // Build user message
  let userMessage: string;
  const weekHeader = `Hafta başlangıç tarihi: ${monday}\nBu plan ${nextWeekNumber}. hafta için oluşturulacak. weekTitle alanı MUTLAKA "Hafta ${nextWeekNumber} — ..." formatında başlamalı.`;

  if (generateMode === "nutrition" || (isNutritionOnly && generateMode !== "workout")) {
    userMessage = `${weeklyContext}${targetsBlock}${dayModesBlock}\n\n${weekHeader}\n\nKullanıcının vücut kompozisyonunu ve yaşam tarzını analiz ederek bu hafta için kişiye özel 7 günlük beslenme programı oluştur. Hedef kiloya göre kalori stratejisi belirle.`;
  } else if (generateMode === "workout") {
    userMessage = `${weeklyContext}${dayModesBlock}\n\n${weekHeader}\n\nÖnceki haftaların programlarını analiz et ve progresif yüklenme uygulayarak bu hafta için daha ilerici bir antrenman programı oluştur. Sadece antrenman programı oluştur, beslenme ekleme.`;
  } else {
    userMessage = `${weeklyContext}${targetsBlock}${dayModesBlock}\n\n${weekHeader}\n\nÖnceki haftaların programlarını analiz et ve progresif yüklenme uygulayarak bu hafta için daha ilerici bir antrenman ve beslenme programı oluştur. Vücut kompozisyonu trendine göre kalori stratejisi belirle. Hacim artır, yeni hareketler ekle, zorluk seviyesini yükselt.`;
  }

  if (userNote?.trim()) {
    userMessage += buildUserNotePriorityBlock(userNote);
  }

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const client = getAIClient();

    // Per-call timeout: 120 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let message;
    try {
      message = await client.messages.create({
        model: AI_MODELS.smart,
        max_tokens: 16000,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      }, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    inputTokens = message.usage.input_tokens;
    outputTokens = message.usage.output_tokens;

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const wasTruncated = message.stop_reason !== "end_turn";

    let validationResult: ValidateWeeklyPlanResult;
    let validationWarnings: string[] = [];

    const validate = (raw: unknown): ValidateWeeklyPlanResult => {
      const result = validateWeeklyPlan(raw, expectedTargets, { expectedDayModes });
      validationResult = result;
      validationWarnings = result.warnings;
      return result;
    };

    if (!wasTruncated) {
      // Full response — try to parse
      try {
        validationResult = validate(parseJSON(text));
      } catch {
        // JSON invalid — try repair
        try {
          const repaired = repairTruncatedJson(text);
          validationResult = validate(JSON.parse(repaired));
        } catch {
          // Repair failed — ask Haiku to fix it (fast, seconds). 30s timeout
          // so a hung Haiku call can't extend the request indefinitely (R4).
          const fixController = new AbortController();
          const fixTimeout = setTimeout(() => fixController.abort(), 30_000);
          try {
            const fixResponse = await client.messages.create({
              model: AI_MODELS.fast,
              max_tokens: 16000,
              messages: [{
                role: "user",
                content: `Aşağıdaki bozuk JSON'ı düzelt ve geçerli JSON olarak döndür. Sadece JSON döndür, başka bir şey yazma.\n\n${text}`,
              }],
            }, { signal: fixController.signal });
            const fixedText = fixResponse.content[0].type === "text" ? fixResponse.content[0].text : "";
            validationResult = validate(parseJSON(fixedText));
          } finally {
            clearTimeout(fixTimeout);
          }
        }
      }
    } else {
      // Truncated — try to repair without retry
      try {
        const repaired = repairTruncatedJson(text);
        validationResult = validate(JSON.parse(repaired));
      } catch {
        // Repair failed — single retry with conciseness nudge
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 120_000);
        try {
          const retry = await client.messages.create({
            model: AI_MODELS.smart,
            max_tokens: 16000,
            system: [
              {
                type: "text",
                text: systemPrompt,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: [{
              role: "user",
              content: `${userMessage}\n\nÖNCEKİ YANITINDA JSON KESİLDİ. Lütfen tüm 7 günü içeren eksiksiz JSON döndür. Egzersiz notlarını ve öğün açıklamalarını KISA tut.`,
            }],
          }, { signal: retryController.signal });

          inputTokens = (inputTokens ?? 0) + retry.usage.input_tokens;
          outputTokens = (outputTokens ?? 0) + retry.usage.output_tokens;

          const retryText = retry.content[0].type === "text" ? retry.content[0].text : "";
          validationResult = validate(parseJSON(retryText));
        } finally {
          clearTimeout(retryTimeout);
        }
      }
    }

    // ─── Content-quality retry: missing days, planType mismatch, empty meals
    // The first response parsed but the validator detected gaps that would
    // present user-visible "boş gün" / wrong planType bugs. One retry with
    // explicit instructions to fix the specific gaps.
    if (needsContentRetry(validationResult)) {
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 120_000);
      try {
        const fixupRetry = await client.messages.create({
          model: AI_MODELS.smart,
          max_tokens: 16000,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{
            role: "user",
            content: `${userMessage}${buildRetryNudge(validationResult)}`,
          }],
        }, { signal: retryController.signal });

        inputTokens = (inputTokens ?? 0) + fixupRetry.usage.input_tokens;
        outputTokens = (outputTokens ?? 0) + fixupRetry.usage.output_tokens;

        const fixupText = fixupRetry.content[0].type === "text" ? fixupRetry.content[0].text : "";
        try {
          const fixupResult = validate(parseJSON(fixupText));
          // Only swap to the retry result if it has FEWER gaps than the first.
          // Otherwise keep the original — the retry made things worse.
          const originalGaps = validationResult.missingDays.length + validationResult.planTypeMismatches.length + validationResult.emptyMealDays.length;
          const retryGaps = fixupResult.missingDays.length + fixupResult.planTypeMismatches.length + fixupResult.emptyMealDays.length;
          if (retryGaps < originalGaps) {
            validationResult = fixupResult;
          } else {
            // Keep original; record that retry didn't help
            validationWarnings.push(
              `content-retry no improvement: ${originalGaps} gap(s) before, ${retryGaps} after — kept original`,
            );
          }
        } catch {
          validationWarnings.push("content-retry parse failed — kept original response");
        }
      } finally {
        clearTimeout(retryTimeout);
      }
    }

    const suggestedPlan = validationResult.plan;

    // Auto-save suggestion (fire-and-forget)
    saveAiSuggestion({
      plan: suggestedPlan,
      userNote: userNote ?? null,
      originalDate: monday,
    }).catch(() => {});

    // Log usage only after successful generation — failed requests don't consume quota
    const hasWarnings = validationWarnings.length > 0;
    await logAiUsage(userId, "weekly", {
      status: hasWarnings ? "success_with_warnings" : "success",
      errorMessage: hasWarnings
        ? JSON.stringify({ warnings: validationWarnings }).slice(0, 500)
        : undefined,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return Response.json({ suggestedPlan });
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(userId, "weekly", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    console.error("[AI Weekly] Error generating plan:", error);
    return Response.json(
      { error: "AI servisi şu anda kullanılamıyor. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
