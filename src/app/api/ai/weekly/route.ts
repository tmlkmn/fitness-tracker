import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAIClient, AI_MODELS, checkRateLimit, logAiUsage } from "@/lib/ai";
import { WEEKLY_PLAN_PROMPT, NUTRITION_ONLY_WEEKLY_PROMPT, WORKOUT_ONLY_WEEKLY_PROMPT } from "@/lib/ai-prompts";
import { buildWeeklyPlanContext } from "@/actions/ai-weekly";
import { saveAiSuggestion } from "@/actions/ai-suggestions";
import { validateWeeklyPlan, type AIWeeklyPlan } from "@/lib/ai-weekly-types";

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

/**
 * Fill missing days (if plan has <7 days) with rest days.
 */
function fillMissingDays(plan: AIWeeklyPlan): AIWeeklyPlan {
  const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  const existingDows = new Set(plan.days.map(d => d.dayOfWeek));

  for (let i = 0; i < 7; i++) {
    if (!existingDows.has(i)) {
      plan.days.push({
        dayOfWeek: i,
        dayName: dayNames[i],
        planType: "rest",
        workoutTitle: null,
        meals: [],
        exercises: [],
      });
    }
  }

  plan.days.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return plan;
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
  try {
    const body = await request.json();
    dateStr = String(body.dateStr ?? "");
    userNote = body.userNote ? String(body.userNote) : undefined;
    generateMode = body.generateMode;
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

  await logAiUsage(userId, "weekly");

  // Get user's service type
  const [userRow] = await db
    .select({ serviceType: users.serviceType })
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

  // Build user message
  let userMessage: string;
  if (generateMode === "nutrition" || (isNutritionOnly && generateMode !== "workout")) {
    userMessage = `${weeklyContext}\n\nHafta başlangıç tarihi: ${monday}\n\nKullanıcının vücut kompozisyonunu ve yaşam tarzını analiz ederek bu hafta için kişiye özel 7 günlük beslenme programı oluştur. Hedef kiloya göre kalori stratejisi belirle.`;
  } else if (generateMode === "workout") {
    userMessage = `${weeklyContext}\n\nHafta başlangıç tarihi: ${monday}\n\nÖnceki haftaların programlarını analiz et ve progresif yüklenme uygulayarak bu hafta için daha ilerici bir antrenman programı oluştur. Sadece antrenman programı oluştur, beslenme ekleme.`;
  } else {
    userMessage = `${weeklyContext}\n\nHafta başlangıç tarihi: ${monday}\n\nÖnceki haftaların programlarını analiz et ve progresif yüklenme uygulayarak bu hafta için daha ilerici bir antrenman ve beslenme programı oluştur. Vücut kompozisyonu trendine göre kalori stratejisi belirle. Hacim artır, yeni hareketler ekle, zorluk seviyesini yükselt.`;
  }

  if (userNote?.trim()) {
    userMessage += `\n\n═══ KULLANICI İSTEĞİ ═══\nKullanıcı bu hafta için şunları belirtti: ${userNote.trim()}\nBu isteği mutlaka dikkate al.`;
  }

  try {
    const client = getAIClient();

    // Per-call timeout: 120 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let message;
    try {
      message = await client.messages.create({
        model: AI_MODELS.smart,
        max_tokens: 8000,
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

    let text = message.content[0].type === "text" ? message.content[0].text : "";
    const wasTruncated = message.stop_reason !== "end_turn";

    let suggestedPlan: AIWeeklyPlan;

    if (!wasTruncated) {
      // Full response — try to parse
      try {
        suggestedPlan = validateWeeklyPlan(parseJSON(text));
      } catch {
        // JSON invalid — try repair
        try {
          const repaired = repairTruncatedJson(text);
          suggestedPlan = fillMissingDays(validateWeeklyPlan(JSON.parse(repaired)));
        } catch {
          // Repair failed — ask Haiku to fix it (fast, seconds)
          const fixResponse = await client.messages.create({
            model: AI_MODELS.fast,
            max_tokens: 8000,
            messages: [{
              role: "user",
              content: `Aşağıdaki bozuk JSON'ı düzelt ve geçerli JSON olarak döndür. Sadece JSON döndür, başka bir şey yazma.\n\n${text}`,
            }],
          });
          const fixedText = fixResponse.content[0].type === "text" ? fixResponse.content[0].text : "";
          suggestedPlan = validateWeeklyPlan(parseJSON(fixedText));
        }
      }
    } else {
      // Truncated — try to repair without retry
      try {
        const repaired = repairTruncatedJson(text);
        suggestedPlan = fillMissingDays(validateWeeklyPlan(JSON.parse(repaired)));
      } catch {
        // Repair failed — single retry with conciseness nudge
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 120_000);
        try {
          const retry = await client.messages.create({
            model: AI_MODELS.smart,
            max_tokens: 8000,
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

          const retryText = retry.content[0].type === "text" ? retry.content[0].text : "";
          suggestedPlan = validateWeeklyPlan(parseJSON(retryText));
        } finally {
          clearTimeout(retryTimeout);
        }
      }
    }

    // Auto-save suggestion (fire-and-forget)
    saveAiSuggestion({
      plan: suggestedPlan,
      userNote: userNote ?? null,
      originalDate: monday,
    }).catch(() => {});

    return Response.json({ suggestedPlan });
  } catch (error) {
    console.error("[AI Weekly] Error generating plan:", error);
    return Response.json(
      { error: "AI servisi şu anda kullanılamıyor. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
