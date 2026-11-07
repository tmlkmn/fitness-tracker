/**
 * Achievement badges, unlocked from the activity stats (`ActivityStats` on
 * the web, `GET /api/v1/me/activity-stats` in the app). Titles and
 * descriptions are in the catalogs under `gamification.achievements.items.<id>`.
 * `icon` is a lucide icon name; the mobile app maps it to its own icon set.
 */

export interface AchievementStats {
  longestStreak: number;
  totalCompletedDays: number;
  totalWorkouts: number;
  totalMeals: number;
}

export interface Achievement {
  id: string;
  icon: string;
  category: "streak" | "workout" | "meal" | "general";
  check: (stats: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  // General
  { id: "first-day", icon: "Footprints", category: "general", check: (s) => s.totalCompletedDays >= 1 },
  // Streak
  { id: "streak-3", icon: "Zap", category: "streak", check: (s) => s.longestStreak >= 3 },
  { id: "streak-7", icon: "Shield", category: "streak", check: (s) => s.longestStreak >= 7 },
  { id: "streak-14", icon: "Sword", category: "streak", check: (s) => s.longestStreak >= 14 },
  { id: "streak-30", icon: "Crown", category: "streak", check: (s) => s.longestStreak >= 30 },
  { id: "streak-60", icon: "Trophy", category: "streak", check: (s) => s.longestStreak >= 60 },
  // Total completed days
  { id: "days-10", icon: "Star", category: "general", check: (s) => s.totalCompletedDays >= 10 },
  { id: "days-30", icon: "Medal", category: "general", check: (s) => s.totalCompletedDays >= 30 },
  { id: "days-50", icon: "Gem", category: "general", check: (s) => s.totalCompletedDays >= 50 },
  { id: "days-100", icon: "Sparkles", category: "general", check: (s) => s.totalCompletedDays >= 100 },
  // Workouts
  { id: "workouts-10", icon: "Dumbbell", category: "workout", check: (s) => s.totalWorkouts >= 10 },
  { id: "workouts-50", icon: "Flame", category: "workout", check: (s) => s.totalWorkouts >= 50 },
  { id: "workouts-100", icon: "HeartPulse", category: "workout", check: (s) => s.totalWorkouts >= 100 },
  // Meals
  { id: "meals-50", icon: "Utensils", category: "meal", check: (s) => s.totalMeals >= 50 },
  { id: "meals-100", icon: "ChefHat", category: "meal", check: (s) => s.totalMeals >= 100 },
];
