import { TURKISH_FOODS } from "../turkish-foods";
import { ENGLISH_FOODS } from "./english-foods";
import type { Locale } from "@/lib/locale";

export type FoodCategory =
  | "protein"
  | "karbonhidrat"
  | "yag"
  | "sebze_meyve"
  | "sut_urunleri";

export interface Food {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: FoodCategory;
}

export const FOOD_CATEGORY_KEYS: readonly FoodCategory[] = [
  "protein",
  "karbonhidrat",
  "yag",
  "sebze_meyve",
  "sut_urunleri",
] as const;

export function getFoodsByLocale(locale: Locale): Food[] {
  return locale === "en" ? ENGLISH_FOODS : TURKISH_FOODS;
}
