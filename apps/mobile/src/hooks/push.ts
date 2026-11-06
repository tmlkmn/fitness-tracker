import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { registerForPush } from "@/lib/push";

import { aiKeys } from "./ai";

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

/** `data` of an AI job push (apps/web/src/lib/ai-jobs.ts → sendMobilePush). */
function aiJobId(data: Record<string, unknown> | undefined): string | null {
  return data?.tag === "ai-job" && typeof data.jobId === "string" ? data.jobId : null;
}

/**
 * AI job pushes: one arriving while the app is open refreshes the job (its
 * screen and the banners update), tapping one — also from a cold start —
 * opens the job.
 */
export function useAiJobNotifications() {
  const router = useRouter();
  const qc = useQueryClient();
  const last = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!last) return;
    const jobId = last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER ? aiJobId(last.notification.request.content.data) : null;
    // Handled once: the last response would otherwise reopen the job on every mount.
    Notifications.clearLastNotificationResponse();
    if (!jobId) return;
    void qc.invalidateQueries({ queryKey: aiKeys.job(jobId) });
    router.push({ pathname: "/ai/job/[jobId]", params: { jobId } });
  }, [last, qc, router]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const jobId = aiJobId(notification.request.content.data);
      if (!jobId) return;
      void qc.invalidateQueries({ queryKey: aiKeys.job(jobId) });
      void qc.invalidateQueries({ queryKey: aiKeys.jobs });
    });
    return () => subscription.remove();
  }, [qc]);
}
