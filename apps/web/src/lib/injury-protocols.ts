/**
 * Structured injury protocols for the weekly workout prompt.
 *
 * Injuries are stored as free text / a JSON array in `users.healthNotes`. The
 * old behaviour passed that text through with a generic "respect injuries"
 * instruction, so the model improvised condition-specific "protocols" that
 * contradicted themselves (cautious warm-up + aggressive main set). This
 * module detects common injury keywords and emits an authoritative DO/DON'T
 * block the model must apply instead of inventing its own.
 *
 * Pure module — no DB access. `detectInjuryProtocols` is called by the weekly
 * context builder, which already loads `healthNotes`.
 */

import type { Locale } from "@/lib/locale";

interface InjuryProtocol {
  id: string;
  /** Folded (ASCII, lowercase, Turkish-letter-normalized) substring triggers. */
  keywords: string[];
  titleTr: string;
  titleEn: string;
  rulesTr: string[];
  rulesEn: string[];
}

/**
 * Fold a string to a Turkish-safe ASCII lowercase form so substring matching
 * is robust to dotted/dotless i and other Turkish letters. NFKD decomposes
 * accented letters (İ→I+◌̇, ü→u+◌̈, ç→c+◌̧ …); stripping combining marks then
 * yields plain ASCII, after which we fold the dotless ı and capital I to "i".
 */
function fold(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/I/g, "i")
    .toLowerCase();
}

const PROTOCOLS: InjuryProtocol[] = [
  {
    id: "meniscus",
    // "menisküs" → folds to "meniskus" (has "menisk"); "meniscus" has "menisc".
    keywords: ["menisk", "menisc"],
    titleTr: "MENİSKÜS PROTOKOLÜ",
    titleEn: "MENISCUS PROTOCOL",
    rulesTr: [
      "Derin diz fleksiyonunu SINIRLA — paralel altına inen squat YOK; yarım/çeyrek squat, kontrollü ROM kullan.",
      "Yüklü açık zincir Leg Extension'dan kaçın (patellofemoral + menisküs stresi); gerekiyorsa çok hafif yük.",
      "Pivot, burgu, ani yön değiştirme ve plyometrik (zıplama) hareketleri YOK.",
      "Leg Press'te ayakları yüksek platforma koy; dizi içe kapatma (valgus), tam kilide gitme.",
      "AĞRI güvenilir bir kılavuz DEĞİL — ağrı hissetmesen bile derinliği veya yükü zorlama.",
      "Isınma ile ana sette AYNI temkinli yaklaşımı koru; 'derinliğe in / paralelin altına geç' gibi çelişkili talimat verme.",
    ],
    rulesEn: [
      "LIMIT deep knee flexion — NO below-parallel squats; use half/quarter squats with controlled ROM.",
      "Avoid loaded open-chain Leg Extension (patellofemoral + meniscal stress); if used, very light load only.",
      "NO pivoting, twisting, sudden direction changes, or plyometric (jumping) movements.",
      "On Leg Press place feet high on the platform; avoid knee valgus and full lockout.",
      "PAIN is not a reliable guide — do not push depth or load even if it feels fine.",
      "Keep the SAME cautious approach in warm-up and main sets; never give a 'go below parallel' cue.",
    ],
  },
  {
    id: "lower_back",
    keywords: ["bel fitigi", "bel agri", "bel ağr", "disk", "herni", "lomber", "lumbar", "lower back", "siyatik", "sciatica"],
    titleTr: "BEL / LOMBER PROTOKOLÜ",
    titleEn: "LOWER-BACK / LUMBAR PROTOCOL",
    rulesTr: [
      "Yüklü omurga fleksiyonundan kaçın — ağır Deadlift, Good Morning, yüklü sit-up/crunch YOK.",
      "Nötr omurgayı koru; core'u destekli makineler ve göğüs destekli varyasyonları tercih et.",
      "Yüksek eksenel yük (ağır back squat, overhead press) yerine Leg Press, göğüs destekli row gibi alternatifler.",
      "Karın için fleksiyon yerine anti-uzama/anti-rotasyon (plank, dead bug, pallof press) kullan.",
      "Isınmada hafif kalça menteşesi + core aktivasyonu; ağrı veren ROM'a girme.",
    ],
    rulesEn: [
      "Avoid loaded spinal flexion — NO heavy deadlifts, good mornings, or loaded sit-ups/crunches.",
      "Keep a neutral spine; prefer machine-supported and chest-supported variations.",
      "Swap high axial-load lifts (heavy back squat, overhead press) for Leg Press, chest-supported row, etc.",
      "Train the core with anti-extension/anti-rotation (plank, dead bug, pallof press) instead of flexion.",
      "Warm up with light hip-hinge + core activation; do not enter a painful ROM.",
    ],
  },
  {
    id: "shoulder_impingement",
    keywords: ["omuz sikis", "omuz sıkış", "omuz agri", "omuz ağr", "impingement", "rotator", "shoulder impinge", "supraspinatus", "sikisma sendrom"],
    titleTr: "OMUZ SIKIŞMASI PROTOKOLÜ",
    titleEn: "SHOULDER IMPINGEMENT PROTOCOL",
    rulesTr: [
      "Ağrılı kavisten kaçın — tam overhead press ve dipte derin bench/dip YOK; ROM'u ağrısız aralıkta tut.",
      "Upright Row ve behind-the-neck hareketleri YOK (sıkışmayı artırır).",
      "Scapular stabilite + rotator cuff (face pull, external rotation, band pull-apart) hacmini artır.",
      "Nötr tutuş (dumbbell, nötr grip) ve hafif eğimli açıları tercih et.",
      "Isınmada cuff aktivasyonu; ağrı varsa yükü düşür, tekrarı azaltma yerine ROM'u kıs.",
    ],
    rulesEn: [
      "Avoid the painful arc — NO full overhead press or deep bottom bench/dips; keep ROM pain-free.",
      "NO upright rows or behind-the-neck movements (they increase impingement).",
      "Add scapular-stability + rotator-cuff volume (face pull, external rotation, band pull-apart).",
      "Prefer neutral grips (dumbbell, neutral handle) and slightly inclined angles.",
      "Warm up with cuff activation; if painful, reduce load and shorten ROM rather than grinding reps.",
    ],
  },
  {
    id: "knee_ligament",
    keywords: ["on capraz", "ön çapraz", "capraz bag", "çapraz bağ", "acl", "pcl", "diz bag", "diz bağ", "ligament"],
    titleTr: "DİZ BAĞ (ÖN/ARKA ÇAPRAZ) PROTOKOLÜ",
    titleEn: "KNEE LIGAMENT (ACL/PCL) PROTOCOL",
    rulesTr: [
      "Kontrollü, çift taraflı kapalı zincir hareketler (Leg Press, kontrollü squat) tercih et; ani hızlanma YOK.",
      "Yüklü açık zincir Leg Extension'ı son derece dikkatli kullan veya çıkar.",
      "Pivot, kesme (cutting), zıplama-iniş YOK; yön değiştirme içeren hareketlerden kaçın.",
      "Hamstring ve quadriceps dengesini koru; tek bacak stabilite çalışmalarını kontrollü ekle.",
      "Isınma ve ana set aynı temkinli derinlik sınırını paylaşsın.",
    ],
    rulesEn: [
      "Prefer controlled, bilateral closed-chain work (Leg Press, controlled squat); NO sudden acceleration.",
      "Use loaded open-chain Leg Extension with extreme caution, or omit it.",
      "NO pivoting, cutting, or jump-landing; avoid direction-change movements.",
      "Balance hamstring and quadriceps work; add single-leg stability work in a controlled way.",
      "Warm-up and main sets must share the same cautious depth limit.",
    ],
  },
];

function renderProtocol(p: InjuryProtocol, locale: Locale): string {
  const title = locale === "en" ? p.titleEn : p.titleTr;
  const rules = locale === "en" ? p.rulesEn : p.rulesTr;
  if (locale === "en") {
    return [
      `═══ INJURY PROTOCOL — ${title} (from the user's health notes) ═══`,
      "These rules are MANDATORY and OVERRIDE every generic training cue (progressive overload, 'full ROM', 'go deep'). Do NOT invent your own protocol — apply this one:",
      ...rules.map((r) => `- ${r}`),
      "═══════════════════════════════════════",
    ].join("\n");
  }
  return [
    `═══ SAKATLIK PROTOKOLÜ — ${title} (kullanıcının sağlık notundan) ═══`,
    "Bu kurallar ZORUNLU ve tüm jenerik antrenman kurallarının (progresif yüklenme, 'tam ROM', 'derinliğe in') ÜSTÜNDEDİR. Kendi protokolünü UYDURMA, bunu uygula:",
    ...rules.map((r) => `- ${r}`),
    "═══════════════════════════════════════════",
  ].join("\n");
}

/**
 * Parses `users.healthNotes` (JSON array or free text), keyword-matches known
 * injuries, and returns the rendered protocol block(s) in the given locale.
 * Returns [] when nothing matches. Each protocol appears at most once.
 */
export function detectInjuryProtocols(
  healthNotes: string | null | undefined,
  locale: Locale,
): string[] {
  if (!healthNotes) return [];
  let text = healthNotes;
  try {
    const parsed = JSON.parse(healthNotes);
    if (Array.isArray(parsed)) text = parsed.join(". ");
  } catch {
    // free text — use as-is
  }
  const hay = fold(text);
  const blocks: string[] = [];
  for (const p of PROTOCOLS) {
    if (p.keywords.some((k) => hay.includes(fold(k)))) {
      blocks.push(renderProtocol(p, locale));
    }
  }
  return blocks;
}
