import type { DayModeChoice } from "@/lib/ai-weekly-types";

export const TURKISH_DAY_NAMES = [
  "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
] as const;

interface DayEntry {
  dow: number;
  name: string;
  mode: DayModeChoice;
  isPast: boolean;
}

function iterateDays(
  dayModes: Partial<Record<number, DayModeChoice>>,
  pastDows: Set<number>,
  fallbackMode: DayModeChoice = "rest",
): DayEntry[] {
  return TURKISH_DAY_NAMES.map((name, dow) => ({
    dow,
    name,
    mode: dayModes[dow] ?? fallbackMode,
    isPast: pastDows.has(dow),
  }));
}

export function buildDayModesBlock(
  dayModes: Partial<Record<number, DayModeChoice>>,
  pastDows: Set<number>,
): string {
  const lines = iterateDays(dayModes, pastDows).map((d) =>
    d.isPast
      ? `  ${d.name}: GEÇMİŞ — bu günü days dizisinde HİÇ DÖNDÜRME (backend boş rest olarak doldurur)`
      : `  ${d.name}: ${d.mode}`,
  );
  return `\n\n═══ GÜNLÜK PLAN TİPLERİ (KRİTİK — birebir uygula) ═══
${lines.join("\n")}
GEÇMİŞ günleri days dizisinden TAMAMEN ÇIKAR — bu günler için içerik üretmek token israfı.
Kalan günlerde planType yukarıdaki listeyle BİREBİR aynı olmalı. workout/swimming → exercises dolu, rest → exercises boş.
GELECEK/BUGÜN günlerinde meals ZORUNLU (min 3-5 öğün; rest günleri dahil).`;
}

export function buildWorkoutOnlyDayModesBlock(
  dayModes: Partial<Record<number, DayModeChoice>>,
  pastDows: Set<number>,
): string {
  const lines = iterateDays(dayModes, pastDows)
    .filter((d) => !d.isPast && (d.mode === "workout" || d.mode === "swimming"))
    .map((d) => `  ${d.name}: ${d.mode}`);

  if (lines.length === 0) {
    return "\n\n(Bu hafta antrenman/yüzme günü yok — days dizisini BOŞ döndür)";
  }

  return `\n\n═══ ANTRENMAN GÜNLERİ (SADECE BU GÜNLER İÇİN EGZERSİZ ÜRET) ═══
${lines.join("\n")}
Listede olmayan günler için days dizisinde HİÇBİR ŞEY DÖNDÜRME. Sadece bu günleri üret.
Her listeli günde exercises DOLU olmalı. meals BOŞ bırak ([] döndür).`;
}

export function buildTrainingDayContextBlock(
  realDayModes: Partial<Record<number, DayModeChoice>>,
  pastDows: Set<number>,
): string {
  const entries = iterateDays(realDayModes, pastDows).filter((d) => !d.isPast);
  let hasAnyTraining = false;
  const lines = entries.map((d) => {
    let label: string;
    if (d.mode === "workout") { label = "ANTRENMAN (ağırlık/direnç)"; hasAnyTraining = true; }
    else if (d.mode === "swimming") { label = "YÜZME (kardiyo)"; hasAnyTraining = true; }
    else label = "DİNLENME";
    return `  ${d.name} (dayOfWeek=${d.dow}): ${label}`;
  });
  if (!hasAnyTraining) return "";
  return `\n\n═══ ANTRENMAN GÜN BAĞLAMI (BESLENMEYİ BUNA GÖRE PLANLA) ═══
${lines.join("\n")}

KULLANIM: Yukarıdaki gün tiplerine göre öğün zamanlama ve makro dağıtımını ayarla. planType alanı yine her gün "nutrition" olarak kalacak — gün tipini SADECE öğün içeriği/zamanlama/karb cycling için kullan.
═══════════════════════════════════════════════════════════════`;
}
