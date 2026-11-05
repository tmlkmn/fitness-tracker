import { useQuery } from "@tanstack/react-query";
import { getAdminKpiSummary } from "@/actions/admin-operations";

/**
 * Lightweight admin KPI summary, used to render a 3-stat mini-card on
 * the settings page entry to the admin panel. Gated server-side: if the
 * caller isn't admin the server action throws Forbidden, which surfaces
 * as `isError` — the consumer can hide the card on error.
 */
export function useAdminKpi(enabled: boolean) {
  return useQuery({
    queryKey: ["admin.kpi"],
    queryFn: () => getAdminKpiSummary(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
