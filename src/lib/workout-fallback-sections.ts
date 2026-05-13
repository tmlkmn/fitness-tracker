/**
 * Deterministic warmup/cooldown templates used when the AI workout call still
 * returns an incomplete response after its retry pass. We'd rather give the
 * user a complete workout with generic mobility/static-stretch blocks than
 * fail the request or surface a broken plan.
 *
 * Templates are intentionally generic and equipment-free so they're safe to
 * inject regardless of the user's environment.
 */

export interface FallbackExercise {
  name: string;
  englishName: string | null;
  section: "warmup" | "cooldown";
  sectionLabel: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

export type FallbackPlanType = "workout" | "swimming";

const WARMUP_LABEL = "Isınma";
const COOLDOWN_LABEL = "Soğuma";

/** 3-exercise dynamic warmup — bodyweight, equipment-free. */
function buildWarmupTemplate(planType: FallbackPlanType): FallbackExercise[] {
  if (planType === "swimming") {
    return [
      {
        name: "Omuz çevirme + kol açma",
        englishName: "shoulder circles + arm openers",
        section: "warmup",
        sectionLabel: WARMUP_LABEL,
        sets: 1,
        reps: "20",
        restSeconds: null,
        durationMinutes: 2,
        notes: "Suya girmeden önce omuz kuşağını hazırla.",
      },
      {
        name: "Boyun ve gövde dinamik streç",
        englishName: "dynamic neck and torso stretch",
        section: "warmup",
        sectionLabel: WARMUP_LABEL,
        sets: 1,
        reps: null,
        restSeconds: null,
        durationMinutes: 2,
        notes: null,
      },
      {
        name: "Yavaş tempolu yüzme",
        englishName: "easy-pace swim",
        section: "warmup",
        sectionLabel: WARMUP_LABEL,
        sets: 1,
        reps: "100m",
        restSeconds: null,
        durationMinutes: 4,
        notes: "Düşük yoğunluk, nefes ritmini ayarla.",
      },
    ];
  }
  return [
    {
      name: "Yerinde hafif tempo + kol salınımı",
      englishName: "light jog in place + arm swings",
      section: "warmup",
      sectionLabel: WARMUP_LABEL,
      sets: 1,
      reps: null,
      restSeconds: null,
      durationMinutes: 3,
      notes: "Nabız yükseltme.",
    },
    {
      name: "Dinamik bacak salınımı",
      englishName: "dynamic leg swings",
      section: "warmup",
      sectionLabel: WARMUP_LABEL,
      sets: 2,
      reps: "10",
      restSeconds: null,
      durationMinutes: null,
      notes: "Her bacak için ileri-geri.",
    },
    {
      name: "Kalça açıcı + dünyanın en iyi esnemesi",
      englishName: "hip opener + world's greatest stretch",
      section: "warmup",
      sectionLabel: WARMUP_LABEL,
      sets: 2,
      reps: "5",
      restSeconds: null,
      durationMinutes: null,
      notes: "Her taraf 5 tekrar.",
    },
  ];
}

/** 2-exercise static cooldown — gentle stretching, equipment-free. */
function buildCooldownTemplate(planType: FallbackPlanType): FallbackExercise[] {
  if (planType === "swimming") {
    return [
      {
        name: "Yavaş tempolu yüzme (cool-down)",
        englishName: "easy-pace cool-down swim",
        section: "cooldown",
        sectionLabel: COOLDOWN_LABEL,
        sets: 1,
        reps: "100m",
        restSeconds: null,
        durationMinutes: 4,
        notes: "Nabzı düşür.",
      },
      {
        name: "Omuz ve göğüs statik streç",
        englishName: "shoulder and chest static stretch",
        section: "cooldown",
        sectionLabel: COOLDOWN_LABEL,
        sets: 1,
        reps: null,
        restSeconds: null,
        durationMinutes: 3,
        notes: "Her pozisyonda 30 sn bekle.",
      },
    ];
  }
  return [
    {
      name: "Quad + hamstring statik streç",
      englishName: "quad + hamstring static stretch",
      section: "cooldown",
      sectionLabel: COOLDOWN_LABEL,
      sets: 1,
      reps: null,
      restSeconds: null,
      durationMinutes: 3,
      notes: "Her bacak 30 sn.",
    },
    {
      name: "Göğüs + omuz açma esnemesi",
      englishName: "chest + shoulder opener stretch",
      section: "cooldown",
      sectionLabel: COOLDOWN_LABEL,
      sets: 1,
      reps: null,
      restSeconds: null,
      durationMinutes: 2,
      notes: "Derin nefes al, gevşe.",
    },
  ];
}

/**
 * Build a fallback set of exercises for any sections still missing after the
 * retry pass. Only `warmup` and `cooldown` are covered — `main`/`swimming`
 * are user-facing training content and must come from the AI; we never
 * synthesize main work.
 */
export function buildFallbackSections(
  missingSections: string[],
  planType: FallbackPlanType,
): FallbackExercise[] {
  const out: FallbackExercise[] = [];
  if (missingSections.includes("warmup")) {
    out.push(...buildWarmupTemplate(planType));
  }
  if (missingSections.includes("cooldown")) {
    out.push(...buildCooldownTemplate(planType));
  }
  return out;
}
