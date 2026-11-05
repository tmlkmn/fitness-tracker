"use client";

import { useUserProfile } from "@/hooks/use-user";

export interface MissingField {
  key: string;
  label: string;
}

const REQUIRED_FIELDS: { key: string; label: string; check: (profile: Record<string, unknown>) => boolean }[] = [
  { key: "age", label: "Yaş", check: (p) => !p.age },
  { key: "height", label: "Boy", check: (p) => !p.height },
  { key: "weight", label: "Başlangıç Kilosu", check: (p) => !p.weight },
  { key: "targetWeight", label: "Hedef Kilo", check: (p) => !p.targetWeight },
  { key: "fitnessLevel", label: "Fitness Seviyesi", check: (p) => !p.fitnessLevel },
  { key: "sportHistory", label: "Spor Geçmişi", check: (p) => !p.sportHistory },
  { key: "currentMedications", label: "İlaçlar / Supplementler", check: (p) => !p.currentMedications },
  { key: "healthNotes", label: "Sağlık Notları", check: (p) => !p.healthNotes },
  { key: "foodAllergens", label: "Gıda Alerjileri", check: (p) => !p.foodAllergens },
  {
    key: "dailyRoutine",
    label: "Günlük Akış",
    check: (p) => !p.dailyRoutine || !Array.isArray(p.dailyRoutine) || (p.dailyRoutine as unknown[]).length === 0,
  },
];

export function useProfileCheck() {
  const { data: profile } = useUserProfile();

  const missingFields: MissingField[] = [];

  if (profile) {
    for (const field of REQUIRED_FIELDS) {
      if (field.check(profile as unknown as Record<string, unknown>)) {
        missingFields.push({ key: field.key, label: field.label });
      }
    }
  }

  return { missingFields, profile };
}
