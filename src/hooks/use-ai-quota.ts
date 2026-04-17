import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAiQuotas, type AiQuotas } from "@/actions/ai-quota";
import type { AIFeature } from "@/lib/ai";

export function useAiQuota() {
  return useQuery({
    queryKey: ["ai-quota"],
    queryFn: () => getAiQuotas(),
    staleTime: 30_000,
  });
}

export function useInvalidateAiQuota() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["ai-quota"] });
}

export function getQuota(
  data: AiQuotas | undefined,
  feature: AIFeature,
): { remaining: number; limit: number } | null {
  if (!data) return null;
  return data[feature] ?? null;
}
