type ProfileLike = {
  age: number | null;
  height: number | null;
  weight: string | null;
  targetWeight: string | null;
  fitnessLevel: string | null;
  sportHistory: string | null;
  currentMedications: string | null;
  healthNotes: string | null;
  foodAllergens: string | null;
  dailyRoutine: unknown;
  weekendRoutine: unknown;
  supplementSchedule: unknown;
} | null | undefined;

export interface CompletenessResult {
  percent: number;
  filled: number;
  total: number;
  missing: string[];
}

function isFilledString(v: string | null | undefined): boolean {
  if (!v) return false;
  const trimmed = v.trim();
  if (!trimmed) return false;
  if (trimmed === "[]") return false;
  return true;
}

function isFilledArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

export function computeProfileCompleteness(profile: ProfileLike): CompletenessResult {
  const missing: string[] = [];

  const checks: Array<[string, boolean]> = [
    ["yaş", profile?.age != null],
    ["boy", profile?.height != null],
    ["kilo", isFilledString(profile?.weight)],
    ["hedef kilo", isFilledString(profile?.targetWeight)],
    ["fitness seviyesi", isFilledString(profile?.fitnessLevel)],
    ["spor geçmişi", isFilledString(profile?.sportHistory)],
    ["ilaç / takviye", isFilledString(profile?.currentMedications)],
    ["sağlık notları", isFilledString(profile?.healthNotes)],
    ["gıda alerjileri", isFilledString(profile?.foodAllergens)],
    ["günlük akış", isFilledArray(profile?.dailyRoutine)],
    ["hafta sonu akışı", isFilledArray(profile?.weekendRoutine)],
    ["takviye takvimi", isFilledArray(profile?.supplementSchedule)],
  ];

  for (const [label, filled] of checks) {
    if (!filled) missing.push(label);
  }

  const total = checks.length;
  const filled = total - missing.length;
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

  return { percent, filled, total, missing };
}
