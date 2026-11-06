import { useQuery } from "@tanstack/react-query";

import { registerForPush } from "@/lib/push";

/**
 * Registers this device for pushes once per session (the tabs layout mounts
 * it; settings reads the outcome and refetches to retry). Cleared with the
 * rest of the cache on sign-out.
 */
export function usePushRegistration() {
  return useQuery({
    queryKey: ["push.registration"],
    queryFn: registerForPush,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
