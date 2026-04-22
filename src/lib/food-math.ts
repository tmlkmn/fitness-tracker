import type { TurkishFood } from "@/data/turkish-foods";

export interface UserFoodLite {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type FoodLike = TurkishFood | UserFoodLite;

export interface ScaledFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function multiplyFood(food: FoodLike, multiplier: number): ScaledFood {
  const m = multiplier > 0 ? multiplier : 1;
  return {
    name: food.name,
    portion: food.portion,
    calories: Math.round(food.calories * m),
    protein: round1(food.protein * m),
    carbs: round1(food.carbs * m),
    fat: round1(food.fat * m),
  };
}

export function formatScaledEntry(food: FoodLike, multiplier: number): string {
  const m = multiplier > 0 ? multiplier : 1;
  if (m === 1) return `${food.name} (${food.portion})`;
  const mStr = Number.isInteger(m) ? `${m}` : m.toFixed(2).replace(/\.?0+$/, "");
  return `${mStr}× ${food.name} (${food.portion})`;
}
