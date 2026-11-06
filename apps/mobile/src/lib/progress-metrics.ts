import type { ProgressLogDto } from "@fitmusc/shared/api/dto";

/** Metrics the progress chart can plot — same list and units as the web's chart selector. */
export const CHART_METRICS = [
  { key: "weight", unit: "kg" },
  { key: "fatPercent", unit: "%" },
  { key: "fatKg", unit: "kg" },
  { key: "fluidPercent", unit: "%" },
  { key: "fluidKg", unit: "kg" },
  { key: "bmi", unit: "" },
  { key: "waistCm", unit: "cm" },
  { key: "rightArmCm", unit: "cm" },
  { key: "leftArmCm", unit: "cm" },
  { key: "rightLegCm", unit: "cm" },
  { key: "leftLegCm", unit: "cm" },
] as const satisfies readonly { key: keyof ProgressLogDto; unit: string }[];

export type ChartMetric = (typeof CHART_METRICS)[number]["key"];

/** Form sections: [field, unit, label key under `progress.modal`]. */
export const MAIN_FIELDS = [
  ["weight", "kg", "weight"],
  ["fatPercent", "%", "fatPercent"],
  ["fatKg", "kg", "fat"],
  ["fluidPercent", "%", "fluidPercent"],
  ["fluidKg", "kg", "fluid"],
  ["bmi", "", "bmi"],
] as const;

export const MEASUREMENT_FIELDS = [
  ["waistCm", "cm", "waist"],
  ["rightArmCm", "cm", "rightArm"],
  ["leftArmCm", "cm", "leftArm"],
  ["rightLegCm", "cm", "rightLeg"],
  ["leftLegCm", "cm", "leftLeg"],
] as const;

/** Body segments from a composition scale: label key under `progress.modal` + field prefix. */
export const BODY_PARTS = [
  ["rightArm", "rightArm"],
  ["leftArm", "leftArm"],
  ["torso", "torso"],
  ["rightLeg", "rightLeg"],
  ["leftLeg", "leftLeg"],
] as const;

const SEGMENT_SUFFIXES = [
  ["FatPercent", "%", "fatField"],
  ["FatKg", "kg", "fatField"],
  ["MusclePercent", "%", "muscleField"],
  ["MuscleKg", "kg", "muscleField"],
] as const;

export const bodyPartFields = (prefix: (typeof BODY_PARTS)[number][1]) =>
  SEGMENT_SUFFIXES.map(([suffix, unit, label]) => [`${prefix}${suffix}` as const, unit, label] as const);

export type MeasurementKey =
  | (typeof MAIN_FIELDS)[number][0]
  | (typeof MEASUREMENT_FIELDS)[number][0]
  | ReturnType<typeof bodyPartFields>[number][0];

export const ALL_FIELDS: MeasurementKey[] = [
  ...MAIN_FIELDS.map(([k]) => k),
  ...MEASUREMENT_FIELDS.map(([k]) => k),
  ...BODY_PARTS.flatMap(([, prefix]) => bodyPartFields(prefix).map(([k]) => k)),
];
