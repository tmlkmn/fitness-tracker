import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/locale";
import type { ExportLabels } from "./blocks";

/**
 * Builds the full label set every export PDF needs from the `export` i18n
 * namespace. PDFs themselves contain no i18n calls (they receive plain
 * strings), mirroring the billing receipt pattern.
 */
export async function buildExportLabels(locale: Locale): Promise<ExportLabels> {
  const t = await getTranslations({ locale, namespace: "export" });
  return {
    brand: "FitMusc",
    generatedAt: t("generatedAt"),
    footer: t("footer"),
    meals: t("meals"),
    time: t("time"),
    meal: t("meal"),
    kcal: t("kcal"),
    protein: t("macros.protein"),
    carbs: t("macros.carbs"),
    fat: t("macros.fat"),
    dayTotal: t("dayTotal"),
    noMeals: t("noMeals"),
    workout: t("workout"),
    sets: t("sets"),
    reps: t("reps"),
    rest: t("rest"),
    duration: t("duration"),
    noWorkout: t("noWorkout"),
    min: t("min"),
    sec: t("sec"),
    supplements: t("supplements"),
    dosage: t("dosage"),
    timing: t("timing"),
    targets: t("targets"),
    planType: {
      workout: t("planType.workout"),
      swimming: t("planType.swimming"),
      rest: t("planType.rest"),
      nutrition: t("planType.nutrition"),
    },
    shoppingTitle: t("shoppingTitle"),
    itemsProgress: t("itemsProgress"),
    progressTitle: t("progressTitle"),
    date: t("date"),
    weight: t("weight"),
    measurements: t("measurements"),
    bodyComposition: t("bodyComposition"),
    latest: t("latest"),
    weightTrend: t("weightTrend"),
    notes: t("notes"),
    noData: t("noData"),
  };
}

/** Sanitizes a title into a safe ASCII-ish filename slug. */
export function slugForFilename(input: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return (
    input
      .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => map[c] ?? c)
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 60) || "export"
  );
}
