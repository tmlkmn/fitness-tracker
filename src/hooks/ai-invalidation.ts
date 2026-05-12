import type { QueryClient } from "@tanstack/react-query";

export function invalidateWorkoutQueries(qc: QueryClient) {
  qc.refetchQueries({ queryKey: ["exercises"] });
  qc.refetchQueries({ queryKey: ["today-dashboard"] });
}

export function invalidateWeeklyPlanQueries(qc: QueryClient) {
  qc.refetchQueries({ queryKey: ["plans"] });
  qc.refetchQueries({ queryKey: ["meals.byDay"] });
  qc.refetchQueries({ queryKey: ["exercises"] });
  qc.refetchQueries({ queryKey: ["today-dashboard"] });
  qc.refetchQueries({ queryKey: ["week-plans-date"] });
}
