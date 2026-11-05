export type WeightUnit = "kg" | "lb";
export type EnergyUnit = "kcal" | "kj";

const KG_TO_LB = 2.2046226218;
const KCAL_TO_KJ = 4.184;

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * KG_TO_LB : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value / KG_TO_LB : value;
}

export function kcalToDisplay(kcal: number, unit: EnergyUnit): number {
  return unit === "kj" ? kcal * KCAL_TO_KJ : kcal;
}

export function displayToKcal(value: number, unit: EnergyUnit): number {
  return unit === "kj" ? value / KCAL_TO_KJ : value;
}

export function formatWeight(
  kg: number | null | undefined,
  unit: WeightUnit,
  digits = 1,
): string {
  if (kg === null || kg === undefined) return "—";
  const v = kgToDisplay(kg, unit);
  return `${v.toFixed(digits)} ${unit}`;
}

export function formatEnergy(
  kcal: number | null | undefined,
  unit: EnergyUnit,
): string {
  if (kcal === null || kcal === undefined) return "—";
  const v = kcalToDisplay(kcal, unit);
  return `${Math.round(v)} ${unit === "kj" ? "kJ" : "kcal"}`;
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit;
}

export function energyUnitLabel(unit: EnergyUnit): string {
  return unit === "kj" ? "kJ" : "kcal";
}
