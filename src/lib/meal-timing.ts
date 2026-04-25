import { normalizeEvent } from "@/lib/routine-constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FitnessGoal =
  | "loss"
  | "recomp"
  | "maintain"
  | "muscle_gain"
  | "weight_gain";

export type MealFrequencyPolicy = "frequent" | "moderate" | "intermittent";

export const FITNESS_GOAL_LABELS: Record<FitnessGoal, string> = {
  loss: "Kilo Verme",
  recomp: "Yağ Yakma + Kas Koruma",
  maintain: "Form Koruma",
  muscle_gain: "Kas Kazanımı",
  weight_gain: "Kilo Alma",
};

export const FITNESS_GOAL_VALUES: readonly FitnessGoal[] = [
  "loss",
  "recomp",
  "maintain",
  "muscle_gain",
  "weight_gain",
];

export function isFitnessGoal(v: unknown): v is FitnessGoal {
  return typeof v === "string" && (FITNESS_GOAL_VALUES as readonly string[]).includes(v);
}

export interface MealTimingSlot {
  time: string; // "HH:MM" 24-hour
  label: string; // "Erken Protein" | "Ara Öğün" | "Post-Workout" | "Akşam Atıştırması"
  rationale: string;
  size: "small" | "medium";
}

export interface MealTimingPolicy {
  policy: MealFrequencyPolicy;
  goal: FitnessGoal;
  goalSource: "explicit" | "derived";
  totalMealsTarget: string;
  eatingWindowHours: number | null;
  slots: MealTimingSlot[];
  summary: string;
  routineSource: "user" | "default"; // did we fall back to defaults?
}

// ─── Policy selection ────────────────────────────────────────────────────────

export function selectPolicy(
  serviceType: string | null,
  goal: FitnessGoal,
): MealFrequencyPolicy {
  const isNutritionOnly = serviceType === "nutrition";
  switch (goal) {
    case "loss":
      return isNutritionOnly ? "intermittent" : "moderate";
    case "recomp":
      return "moderate";
    case "maintain":
      return isNutritionOnly ? "intermittent" : "frequent";
    case "muscle_gain":
      return "frequent";
    case "weight_gain":
      return "frequent";
  }
}

export function deriveGoalFallback(
  weight: number | null,
  targetWeight: number | null,
  serviceType: string | null,
): FitnessGoal {
  // If we have both, infer from delta. Tolerance ±1kg → maintain.
  if (weight != null && targetWeight != null) {
    const delta = targetWeight - weight;
    if (delta < -1) return "loss";
    if (delta > 1) {
      // No service-type difference: default to muscle_gain (safer for full,
      // and nutrition-only weight gain typically still benefits from
      // protein-frequent). If user really wants raw bulk they should pick
      // weight_gain explicitly.
      return "muscle_gain";
    }
    return "maintain";
  }
  // No targetWeight set — default by service type.
  return serviceType === "nutrition" ? "maintain" : "muscle_gain";
}

// ─── Time helpers ────────────────────────────────────────────────────────────

function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function formatTime(minutes: number): string {
  const total = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function roundTo5(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

// ─── Routine extraction ──────────────────────────────────────────────────────

interface RoutineTimes {
  wake: number | null;
  breakfast: number | null;
  lunch: number | null;
  dinner: number | null;
  sleep: number | null;
  workout: number | null;
}

const DEFAULTS: Required<Omit<RoutineTimes, "workout">> = {
  wake: 7 * 60,
  breakfast: 8 * 60 + 30,
  lunch: 13 * 60,
  dinner: 19 * 60,
  sleep: 23 * 60,
};

function extractRoutineTimes(
  routine: { time: string; event: string }[] | null,
): { times: RoutineTimes; source: "user" | "default" } {
  const times: RoutineTimes = {
    wake: null,
    breakfast: null,
    lunch: null,
    dinner: null,
    sleep: null,
    workout: null,
  };
  if (!Array.isArray(routine) || routine.length === 0) {
    return {
      times: { ...DEFAULTS, workout: null },
      source: "default",
    };
  }
  for (const entry of routine) {
    const minutes = parseTime(entry.time);
    if (minutes == null) continue;
    const event = normalizeEvent(entry.event);
    switch (event) {
      case "Uyanış":
        times.wake = minutes;
        break;
      case "Kahvaltı":
        times.breakfast = minutes;
        break;
      case "Öğle Yemeği":
        times.lunch = minutes;
        break;
      case "Akşam Yemeği":
        times.dinner = minutes;
        break;
      case "Uyku":
        times.sleep = minutes;
        break;
      case "Antrenman":
        times.workout = minutes;
        break;
    }
  }
  // Fill missing from defaults but track source as "user" since at least
  // some events were extracted.
  return {
    times: {
      wake: times.wake ?? DEFAULTS.wake,
      breakfast: times.breakfast ?? DEFAULTS.breakfast,
      lunch: times.lunch ?? DEFAULTS.lunch,
      dinner: times.dinner ?? DEFAULTS.dinner,
      sleep: times.sleep ?? DEFAULTS.sleep,
      workout: times.workout,
    },
    source: "user",
  };
}

// ─── Slot generation ─────────────────────────────────────────────────────────

interface SlotThresholds {
  earlyProteinH: number | null; // null = never add early protein slot
  mainGapH: number | null; // null = never add inter-main snack
  eveningSnackH: number | null;
  earlyProteinRequiresWorkoutDay: boolean;
}

function thresholdsForPolicy(policy: MealFrequencyPolicy): SlotThresholds {
  switch (policy) {
    case "frequent":
      return {
        earlyProteinH: 2.5,
        mainGapH: 3,
        eveningSnackH: 4,
        earlyProteinRequiresWorkoutDay: false,
      };
    case "moderate":
      return {
        earlyProteinH: 2.5,
        mainGapH: 3.5,
        eveningSnackH: 4.5,
        earlyProteinRequiresWorkoutDay: true,
      };
    case "intermittent":
      return {
        earlyProteinH: null,
        mainGapH: null,
        eveningSnackH: null,
        earlyProteinRequiresWorkoutDay: false,
      };
  }
}

function generateSlots(
  times: RoutineTimes,
  policy: MealFrequencyPolicy,
  planType: string | null,
  isFullProgram: boolean,
): MealTimingSlot[] {
  const t = thresholdsForPolicy(policy);
  const slots: MealTimingSlot[] = [];

  const isWorkoutDay = planType === "workout" || planType === "swimming";

  // 1. Early Protein — wake → breakfast gap
  if (t.earlyProteinH != null && times.wake != null && times.breakfast != null) {
    const gapMin = times.breakfast - times.wake;
    const allowEarlyProtein =
      !t.earlyProteinRequiresWorkoutDay || isWorkoutDay;
    if (gapMin >= t.earlyProteinH * 60 && allowEarlyProtein) {
      const slotMin = roundTo5(times.wake + 45); // 45 dk sonra
      slots.push({
        time: formatTime(slotMin),
        label: "Erken Protein",
        rationale: `Uyanış ${formatTime(times.wake)} → Kahvaltı ${formatTime(times.breakfast)} arası ${(gapMin / 60).toFixed(1)}h`,
        size: "small",
      });
    }
  }

  // 2. Inter-main snacks — breakfast → lunch, lunch → dinner
  type MainPair = { from: number | null; fromLabel: string; to: number | null; toLabel: string };
  const pairs: MainPair[] = [
    {
      from: times.breakfast,
      fromLabel: "Kahvaltı",
      to: times.lunch,
      toLabel: "Öğle",
    },
    {
      from: times.lunch,
      fromLabel: "Öğle",
      to: times.dinner,
      toLabel: "Akşam",
    },
  ];

  if (t.mainGapH != null) {
    for (const pair of pairs) {
      if (pair.from == null || pair.to == null) continue;
      const gap = pair.to - pair.from;
      if (gap < t.mainGapH * 60) continue;

      // If a workout falls within this window AND user is full program,
      // use Post-Workout label at workout+30 instead of midpoint snack.
      const inWorkoutWindow =
        isFullProgram &&
        times.workout != null &&
        times.workout > pair.from &&
        times.workout < pair.to;

      if (inWorkoutWindow && times.workout != null) {
        const slotMin = roundTo5(times.workout + 30);
        slots.push({
          time: formatTime(slotMin),
          label: "Post-Workout",
          rationale: `Antrenman ${formatTime(times.workout)} sonrası 30dk içinde protein+karb`,
          size: "medium",
        });
      } else {
        const mid = roundTo5(pair.from + Math.floor(gap / 2));
        slots.push({
          time: formatTime(mid),
          label: "Ara Öğün",
          rationale: `${pair.fromLabel} ${formatTime(pair.from)} → ${pair.toLabel} ${formatTime(pair.to)} arası ${(gap / 60).toFixed(1)}h boşluk`,
          size: policy === "moderate" ? "small" : "medium",
        });
      }
    }
  }

  // 3. Evening snack — dinner → sleep
  if (
    t.eveningSnackH != null &&
    times.dinner != null &&
    times.sleep != null
  ) {
    // sleep can wrap past midnight (e.g. 00:30); handle by adding 24h if needed
    let sleepMin = times.sleep;
    if (sleepMin < times.dinner) sleepMin += 24 * 60;
    const gap = sleepMin - times.dinner;
    if (gap >= t.eveningSnackH * 60) {
      const slotMin = roundTo5(times.dinner + Math.min(120, Math.floor(gap / 2)));
      slots.push({
        time: formatTime(slotMin),
        label: "Akşam Atıştırması",
        rationale: `Akşam ${formatTime(times.dinner)} → Uyku ${formatTime(times.sleep)} arası ${(gap / 60).toFixed(1)}h`,
        size: "small",
      });
    }
  }

  // Sort by time
  slots.sort((a, b) => (parseTime(a.time) ?? 0) - (parseTime(b.time) ?? 0));
  return slots;
}

// ─── Targets per policy ──────────────────────────────────────────────────────

function policyTargets(policy: MealFrequencyPolicy): {
  totalMealsTarget: string;
  eatingWindowHours: number | null;
} {
  switch (policy) {
    case "frequent":
      return { totalMealsTarget: "5-7 öğün/gün", eatingWindowHours: null };
    case "moderate":
      return { totalMealsTarget: "4-5 öğün/gün", eatingWindowHours: null };
    case "intermittent":
      return { totalMealsTarget: "3-4 öğün/gün", eatingWindowHours: 9 };
  }
}

// ─── Public entry point ──────────────────────────────────────────────────────

export interface ComputeMealTimingInput {
  routine: { time: string; event: string }[] | null;
  serviceType: string | null;
  fitnessGoal: FitnessGoal | null;
  weight: number | null;
  targetWeight: number | null;
  planType: string | null;
}

export function computeMealTimingPolicy(
  input: ComputeMealTimingInput,
): MealTimingPolicy {
  const goalSource: "explicit" | "derived" = input.fitnessGoal
    ? "explicit"
    : "derived";
  const goal: FitnessGoal = input.fitnessGoal
    ?? deriveGoalFallback(input.weight, input.targetWeight, input.serviceType);
  const policy = selectPolicy(input.serviceType, goal);
  const { times, source: routineSource } = extractRoutineTimes(input.routine);
  const isFullProgram = input.serviceType !== "nutrition";
  const slots = generateSlots(times, policy, input.planType, isFullProgram);
  const { totalMealsTarget, eatingWindowHours } = policyTargets(policy);

  const policyLabel: Record<MealFrequencyPolicy, string> = {
    frequent: "frequent (sık öğün)",
    moderate: "moderate (orta sıklık)",
    intermittent: "intermittent (aralıklı açlık)",
  };

  const goalNote =
    goalSource === "explicit"
      ? `${FITNESS_GOAL_LABELS[goal]}`
      : `${FITNESS_GOAL_LABELS[goal]} (varsayım — kullanıcı profilden hedef seçmemiş)`;

  const lines: string[] = [];
  lines.push(
    `Politika: ${policyLabel[policy]} (${input.serviceType === "nutrition" ? "Sadece Beslenme" : "Tam Program"} + ${goalNote})`,
  );
  lines.push(`Hedef öğün sayısı: ${totalMealsTarget}`);
  if (eatingWindowHours != null) {
    lines.push(`Yeme penceresi hedefi: ${eatingWindowHours} saat (aralıklı açlık)`);
  }
  if (routineSource === "default") {
    lines.push(
      "NOT: Kullanıcı rutin tanımlamamış — varsayılan saatler kullanıldı (Uyanış 07:00, Kahvaltı 08:30, Öğle 13:00, Akşam 19:00, Uyku 23:00).",
    );
  }
  if (slots.length > 0) {
    lines.push("Tespit edilen ara öğün slotları:");
    for (const s of slots) {
      lines.push(`  - ${s.time} ${s.label} [${s.size}] — ${s.rationale}`);
    }
    lines.push(
      "Bu slotlara birebir uygun öğün üret; saat ± 15dk içinde kalsın, etiket aynen kullanılsın.",
    );
  } else {
    if (policy === "intermittent") {
      lines.push(
        "Ara öğün slotu YOK — kullanıcı aralıklı açlığa yönlendiriliyor. Sadece ana öğünler (3-4) üret, aralarda ekstra öğün ekleme.",
      );
    } else {
      lines.push(
        "Bu rutinle ara öğün gerekli görülmedi — ana öğünlere odaklan.",
      );
    }
  }

  return {
    policy,
    goal,
    goalSource,
    totalMealsTarget,
    eatingWindowHours,
    slots,
    summary: lines.join("\n"),
    routineSource,
  };
}
