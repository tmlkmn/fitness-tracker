import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReminders,
  createReminder,
  createReminderFromTemplate,
  updateReminder,
  deleteReminder,
  toggleReminder,
} from "@/actions/reminders";

type Reminder = Awaited<ReturnType<typeof getReminders>>[number];

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: () => getReminders(),
    staleTime: 60_000,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReminder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function useCreateFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReminderFromTemplate,
    onMutate: async (templateKey: string) => {
      await qc.cancelQueries({ queryKey: ["reminders"] });
      const prev = qc.getQueryData<Reminder[]>(["reminders"]);
      if (prev) {
        const existing = prev.find((r) => r.templateKey === templateKey);
        if (existing) {
          qc.setQueryData<Reminder[]>(["reminders"],
            prev.map((r) => r.id === existing.id ? { ...r, isEnabled: true } : r)
          );
        }
      }
      return { prev };
    },
    onError: (_err, _key, context) => {
      if (context?.prev) qc.setQueryData(["reminders"], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateReminder>[1] }) =>
      updateReminder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteReminder,
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["reminders"] });
      const prev = qc.getQueryData<Reminder[]>(["reminders"]);
      if (prev) {
        qc.setQueryData<Reminder[]>(["reminders"], prev.filter((r) => r.id !== id));
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(["reminders"], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function useToggleReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      toggleReminder(id, isEnabled),
    onMutate: async ({ id, isEnabled }) => {
      await qc.cancelQueries({ queryKey: ["reminders"] });
      const prev = qc.getQueryData<Reminder[]>(["reminders"]);
      if (prev) {
        qc.setQueryData<Reminder[]>(["reminders"],
          prev.map((r) => r.id === id ? { ...r, isEnabled } : r)
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["reminders"], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}
