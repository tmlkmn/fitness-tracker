/**
 * Infer a default meal time from the user's daily routine based on the meal label.
 */

type RoutineItem = { time: string; event: string };

const MEAL_LABEL_MATCHERS: { keywords: string[]; eventKeywords: string[] }[] = [
  {
    keywords: ["kahvaltı", "sabah", "breakfast"],
    eventKeywords: ["kahvaltı", "sabah", "uyanma", "uyan"],
  },
  {
    keywords: ["ara öğün", "kuşluk", "snack"],
    eventKeywords: ["ara", "kuşluk", "atıştırma"],
  },
  {
    keywords: ["öğle", "lunch"],
    eventKeywords: ["öğle", "lunch"],
  },
  {
    keywords: ["ikindi", "afternoon"],
    eventKeywords: ["ikindi", "afternoon"],
  },
  {
    keywords: ["akşam", "dinner", "yemek"],
    eventKeywords: ["akşam", "dinner", "yemek"],
  },
  {
    keywords: ["gece", "night", "yatmadan"],
    eventKeywords: ["gece", "uyku", "yatma", "yat"],
  },
];

export function getDefaultMealTime(
  mealLabel: string,
  routine: RoutineItem[] | null | undefined,
): string {
  if (!routine || routine.length === 0 || !mealLabel) return "08:00";

  const label = mealLabel.toLowerCase().trim();

  for (const matcher of MEAL_LABEL_MATCHERS) {
    const labelMatch = matcher.keywords.some((kw) => label.includes(kw));
    if (!labelMatch) continue;

    // Find matching routine event
    for (const item of routine) {
      const event = item.event.toLowerCase();
      if (matcher.eventKeywords.some((kw) => event.includes(kw))) {
        return item.time;
      }
    }

    // If label matches "kahvaltı" but no exact routine event found,
    // use the first routine time (wake up time) + 30 min offset
    if (matcher.keywords.includes("kahvaltı") && routine.length > 0) {
      return addMinutesToTime(routine[0].time, 30);
    }
  }

  return "08:00";
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/**
 * Determine if a date falls on a weekend (Saturday or Sunday).
 */
export function isWeekendDate(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}
