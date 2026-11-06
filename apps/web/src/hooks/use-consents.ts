import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hasAiConsent } from "@fitmusc/shared/consent";
import { getMyConsents, setMyConsents } from "@/actions/consent";

export function useConsents() {
  return useQuery({
    queryKey: ["user.consents"],
    queryFn: () => getMyConsents(),
    staleTime: 60_000,
  });
}

export function useSetConsents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: { data?: boolean; ai?: boolean }) => setMyConsents(change),
    onSuccess: (consents) => {
      queryClient.setQueryData(["user.consents"], consents);
      // The greeting falls back to a plain text without the AI consent.
      void queryClient.invalidateQueries({ queryKey: ["dashboard.greeting"] });
    },
  });
}

/** True once the AI consent is confirmed — for queries that call the AI by themselves. */
export function useAiConsentGranted(): boolean {
  const consents = useConsents();
  return hasAiConsent(consents.data?.aiConsentAt);
}
