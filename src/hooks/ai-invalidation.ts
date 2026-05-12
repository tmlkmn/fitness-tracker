import type { QueryClient } from "@tanstack/react-query";

/**
 * Hybrid invalidation policy:
 *   - `today-dashboard` is the surface most likely visible right after an AI
 *     apply, so we `refetchQueries` (eager) to show fresh state immediately.
 *   - Background keys (`exercises`, `meals.byDay`, `plans`, `week-plans-date`)
 *     are `invalidateQueries` (lazy) — they refetch on next mount/subscribe.
 *     This avoids 4-5 network requests fired for screens the user may not be
 *     looking at, especially on mobile.
 */

function refetchTodayDashboard(qc: QueryClient) {
  qc.refetchQueries({ queryKey: ["today-dashboard"] });
}

export function invalidateWorkoutQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["exercises"] });
  refetchTodayDashboard(qc);
}

export function invalidateMealQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["meals.byDay"] });
  refetchTodayDashboard(qc);
}

export function invalidateWeeklyPlanQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["plans"] });
  qc.invalidateQueries({ queryKey: ["meals.byDay"] });
  qc.invalidateQueries({ queryKey: ["exercises"] });
  qc.invalidateQueries({ queryKey: ["week-plans-date"] });
  refetchTodayDashboard(qc);
}
