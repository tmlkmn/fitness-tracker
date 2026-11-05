import type { ActivityStats } from "@/actions/activity-stats";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  category: "streak" | "workout" | "meal" | "general";
  check: (stats: ActivityStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // General
  {
    id: "first-day",
    title: "İlk Adım",
    description: "İlk günü tamamen tamamladın!",
    icon: "Footprints",
    category: "general",
    check: (s) => s.totalCompletedDays >= 1,
  },
  // Streak
  {
    id: "streak-3",
    title: "3 Gün Serisi",
    description: "Üst üste 3 gün boyunca planı tamamladın.",
    icon: "Zap",
    category: "streak",
    check: (s) => s.longestStreak >= 3,
  },
  {
    id: "streak-7",
    title: "Haftalık Savaşçı",
    description: "Tam 1 hafta boyunca hiç aksatmadın!",
    icon: "Shield",
    category: "streak",
    check: (s) => s.longestStreak >= 7,
  },
  {
    id: "streak-14",
    title: "2 Hafta Kararlılık",
    description: "14 gün üst üste — inanılmaz disiplin!",
    icon: "Sword",
    category: "streak",
    check: (s) => s.longestStreak >= 14,
  },
  {
    id: "streak-30",
    title: "30 Gün Efsanesi",
    description: "Bir ay boyunca her gün tamamladın. Efsane!",
    icon: "Crown",
    category: "streak",
    check: (s) => s.longestStreak >= 30,
  },
  {
    id: "streak-60",
    title: "60 Gün Titanı",
    description: "2 ay boyunca vazgeçmedin. Sen bir titansın!",
    icon: "Trophy",
    category: "streak",
    check: (s) => s.longestStreak >= 60,
  },
  // Total completed days
  {
    id: "days-10",
    title: "10 Gün Tamamlandı",
    description: "Toplam 10 günü tamamen tamamladın.",
    icon: "Star",
    category: "general",
    check: (s) => s.totalCompletedDays >= 10,
  },
  {
    id: "days-30",
    title: "30 Gün Tamamlandı",
    description: "Toplam 30 tam gün — harika ilerleme!",
    icon: "Medal",
    category: "general",
    check: (s) => s.totalCompletedDays >= 30,
  },
  {
    id: "days-50",
    title: "50 Gün Tamamlandı",
    description: "Yarım yüz gün! Durdurulamıyorsun.",
    icon: "Gem",
    category: "general",
    check: (s) => s.totalCompletedDays >= 50,
  },
  {
    id: "days-100",
    title: "Yüzüncü Gün",
    description: "100 tam gün. Bu bir yaşam tarzı artık!",
    icon: "Sparkles",
    category: "general",
    check: (s) => s.totalCompletedDays >= 100,
  },
  // Workouts
  {
    id: "workouts-10",
    title: "10 Antrenman",
    description: "10 egzersizi tamamladın!",
    icon: "Dumbbell",
    category: "workout",
    check: (s) => s.totalWorkouts >= 10,
  },
  {
    id: "workouts-50",
    title: "50 Antrenman",
    description: "50 egzersiz tamamlandı — güçleniyorsun!",
    icon: "Flame",
    category: "workout",
    check: (s) => s.totalWorkouts >= 50,
  },
  {
    id: "workouts-100",
    title: "100 Antrenman",
    description: "100 egzersiz! Vücudun sana teşekkür ediyor.",
    icon: "HeartPulse",
    category: "workout",
    check: (s) => s.totalWorkouts >= 100,
  },
  // Meals
  {
    id: "meals-50",
    title: "50 Öğün Takibi",
    description: "50 öğünü takip ettim — beslenme bilinci!",
    icon: "Utensils",
    category: "meal",
    check: (s) => s.totalMeals >= 50,
  },
  {
    id: "meals-100",
    title: "100 Öğün Takibi",
    description: "100 öğün kaydı. Beslenme ustası!",
    icon: "ChefHat",
    category: "meal",
    check: (s) => s.totalMeals >= 100,
  },
];
