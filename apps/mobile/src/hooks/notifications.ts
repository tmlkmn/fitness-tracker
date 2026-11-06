import type { CountDto, NotificationDto, NotificationPreferencesDto } from "@fitmusc/shared/api/dto";
import type { notificationPreferencesSchema } from "@fitmusc/shared/api/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCalendars } from "expo-localization";
import { useEffect, useRef } from "react";
import type { z } from "zod";

import { api } from "@/lib/api";

import { patchCaches, restore } from "./cache";
import { calendarKeys } from "./calendar";

export const notificationKeys = {
  list: ["notifications.list"] as const,
  unread: ["notifications.unread"] as const,
  preferences: calendarKeys.preferences,
};

/** The in-app notifications (web: the bell's dropdown). */
export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.list, queryFn: () => api<NotificationDto[]>("/notifications") });
}

/** Unread count for the bell; polled while the app is in the foreground (the web polls every 30 s). */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => api<CountDto>("/notifications/unread-count"),
    refetchInterval: 60_000,
  });
}

/** Opening the list marks everything read, like opening the web's dropdown. */
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      qc.setQueryData<CountDto>(notificationKeys.unread, { count: 0 });
      // Keep the open list's "new" dots; the next visit shows them read.
      void qc.invalidateQueries({ queryKey: notificationKeys.list, refetchType: "none" });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/notifications/${id}`, { method: "DELETE" }),
    onMutate: (id) => patchCaches<NotificationDto[]>(qc, [notificationKeys.list], (list) => list.filter((n) => n.id !== id)),
    onError: (_err, _id, snapshot) => restore(qc, snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.unread }),
  });
}

export function useClearNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/notifications", { method: "DELETE" }),
    onSuccess: () => {
      qc.setQueryData<NotificationDto[]>(notificationKeys.list, []);
      qc.setQueryData<CountDto>(notificationKeys.unread, { count: 0 });
    },
  });
}

// ── Preferences (web: NotificationPreferencesCard) ──────────────────────────

export type PreferencesPatch = z.input<typeof notificationPreferencesSchema>;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: () => api<NotificationPreferencesDto>("/me/notification-preferences"),
  });
}

/** PATCH: only the fields sent change. Applied to the cache at once (the week start redraws the calendar). */
export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PreferencesPatch) => api("/me/notification-preferences", { method: "PATCH", body: patch }),
    onMutate: (patch) =>
      patchCaches<NotificationPreferencesDto>(qc, [notificationKeys.preferences], (prefs) => ({ ...prefs, ...patch })),
    onError: (_err, _patch, snapshot) => restore(qc, snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.preferences }),
  });
}

const IANA_ZONE = /^(UTC|[A-Za-z]+(\/[A-Za-z0-9_+-]+){1,2})$/;

/**
 * Reminders fire in the user's time zone; when none is saved yet, store the
 * phone's (the web does the same from the browser when the reminders open).
 */
export function useEnsureTimezone(prefs: NotificationPreferencesDto | undefined) {
  const update = useUpdatePreferences();
  const sent = useRef(false);
  useEffect(() => {
    if (!prefs || prefs.timezone || sent.current) return;
    const zone = getCalendars()[0]?.timeZone;
    if (!zone || !IANA_ZONE.test(zone)) return;
    sent.current = true;
    update.mutate({ timezone: zone });
  }, [prefs, update]);
}
