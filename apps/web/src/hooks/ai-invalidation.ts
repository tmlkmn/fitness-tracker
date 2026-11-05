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

/**
 * Refresh the AI quota badges. Call this after any AI mutation (successful
 * or failed-after-counting) so users see their remaining quota update
 * without a manual page reload.
 */
export function invalidateAiQuotaQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["ai.quota"] });
}

export function invalidateWorkoutQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["exercises"] });
  invalidateAiQuotaQueries(qc);
  refetchTodayDashboard(qc);
}

export function invalidateMealQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["meals.byDay"] });
  invalidateAiQuotaQueries(qc);
  refetchTodayDashboard(qc);
}

export function invalidateWeeklyPlanQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["plans"] });
  qc.invalidateQueries({ queryKey: ["meals.byDay"] });
  qc.invalidateQueries({ queryKey: ["exercises"] });
  qc.invalidateQueries({ queryKey: ["week-plans-date"] });
  // Drives the week strip / month grid plan-type icons (dumbbell, rest, …).
  // Without this the markers stay stale until a hard refresh because the query
  // is persisted to IndexedDB and stays mounted on the calendar page.
  qc.invalidateQueries({ queryKey: ["dates-with-plans"] });
  invalidateAiQuotaQueries(qc);
  refetchTodayDashboard(qc);
}
