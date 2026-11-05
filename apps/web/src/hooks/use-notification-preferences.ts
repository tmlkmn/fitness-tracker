import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/actions/notification-preferences";

type Prefs = Awaited<ReturnType<typeof getNotificationPreferences>>;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: getNotificationPreferences,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      defaultWorkoutTime?: string;
      timezone?: string;
      quietHoursStart?: string | null;
      quietHoursEnd?: string | null;
      weekStartsOn?: "monday" | "sunday";
    }) => updateNotificationPreferences(data),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["notification-preferences"] });
      const prev = qc.getQueryData<Prefs>(["notification-preferences"]);
      if (prev) {
        qc.setQueryData<Prefs>(["notification-preferences"], { ...prev, ...data });
      }
      return { prev };
    },
    onError: (_err, _data, context) => {
      if (context?.prev) qc.setQueryData(["notification-preferences"], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
