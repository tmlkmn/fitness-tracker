"use client";

import { useQuery } from "@tanstack/react-query";
import { getDeloadRecommendation } from "@/actions/deload";
import type { DeloadRecommendation } from "@/lib/deload-policy";

export function useDeloadRecommendation(dateStr: string | undefined, enabled: boolean) {
  return useQuery<DeloadRecommendation>({
    queryKey: ["deload.recommendation", dateStr],
    queryFn: () => getDeloadRecommendation(dateStr as string),
    enabled: enabled && typeof dateStr === "string" && dateStr.length > 0,
    staleTime: 60_000,
  });
}
