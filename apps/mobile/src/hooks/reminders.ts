import type { IdDto, ReminderDto } from "@fitmusc/shared/api/dto";
import type { reminderCreateSchema, reminderUpdateSchema } from "@fitmusc/shared/api/schemas";
import type { ReminderTemplateKey } from "@fitmusc/shared/reminder-templates";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

import { api } from "@/lib/api";

import { patchCaches, restore } from "./cache";

// Reminders the server's cron sends (in-app, push, optional e-mail) —
// web: ReminderSettingsCard and its dialogs.

export type ReminderCreate = z.input<typeof reminderCreateSchema>;
export type ReminderUpdate = z.input<typeof reminderUpdateSchema>;

export const reminderKeys = { list: ["reminders.list"] as const };

export function useReminders() {
  return useQuery({ queryKey: reminderKeys.list, queryFn: () => api<ReminderDto[]>("/reminders") });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: reminderKeys.list });
}

export function useCreateReminder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: ReminderCreate) => api<IdDto>("/reminders", { method: "POST", body }),
    onSettled: invalidate,
  });
}

/** PATCH: only the fields sent change. */
export function useUpdateReminder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ReminderUpdate }) => api(`/reminders/${id}`, { method: "PATCH", body: patch }),
    onSettled: invalidate,
  });
}

export function useToggleReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      api(`/reminders/${id}/enabled`, { method: "PUT", body: { isEnabled } }),
    onMutate: ({ id, isEnabled }) =>
      patchCaches<ReminderDto[]>(qc, [reminderKeys.list], (list) => list.map((r) => (r.id === id ? { ...r, isEnabled } : r))),
    onError: (_err, _vars, snapshot) => restore(qc, snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: reminderKeys.list }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/reminders/${id}`, { method: "DELETE" }),
    onMutate: (id) => patchCaches<ReminderDto[]>(qc, [reminderKeys.list], (list) => list.filter((r) => r.id !== id)),
    onError: (_err, _id, snapshot) => restore(qc, snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: reminderKeys.list }),
  });
}

/** Turns a preset on (water, stretching, …) with its default schedule. */
export function useCreateFromTemplate() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (templateKey: ReminderTemplateKey) => api<IdDto>("/reminders/from-template", { method: "POST", body: { templateKey } }),
    onSettled: invalidate,
  });
}
