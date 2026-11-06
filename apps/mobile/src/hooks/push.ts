import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { notificationTarget, openTarget } from "@/lib/notification-links";
import { registerForPush } from "@/lib/push";

import { aiKeys } from "./ai";
import { notificationKeys } from "./notifications";
import { sharingKeys } from "./sharing";

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

const text = (value: unknown) => (typeof value === "string" ? value : null);

/**
 * Pushes (PushDataDto: `url` = web path, `tag` = notification type). Tapping
 * one — also from a cold start — opens its screen: an AI job's result, the
 * shared plans, Today for meal / workout reminders, … (src/lib/notification-links.ts).
 * One arriving while the app is open refreshes the bell and what it is about.
 */
export function usePushNotifications() {
  const router = useRouter();
  const qc = useQueryClient();
  const last = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!last) return;
    const tapped = last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;
    const data = last.notification.request.content.data;
    // Handled once: the last response would otherwise reopen the screen on every mount.
    Notifications.clearLastNotificationResponse();
    if (!tapped) return;
    const jobId = aiJobId(data);
    if (jobId) {
      void qc.invalidateQueries({ queryKey: aiKeys.job(jobId) });
      router.push({ pathname: "/ai/job/[jobId]", params: { jobId } });
      return;
    }
    openTarget(notificationTarget(text(data?.url), text(data?.tag)), (href) => router.navigate(href));
  }, [last, qc, router]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      void qc.invalidateQueries({ queryKey: notificationKeys.unread });
      void qc.invalidateQueries({ queryKey: notificationKeys.list });
      if (data?.tag === "plan_shared") void qc.invalidateQueries({ queryKey: sharingKeys.withMe });
      const jobId = aiJobId(data);
      if (!jobId) return;
      void qc.invalidateQueries({ queryKey: aiKeys.job(jobId) });
      void qc.invalidateQueries({ queryKey: aiKeys.jobs });
    });
    return () => subscription.remove();
  }, [qc]);
}
