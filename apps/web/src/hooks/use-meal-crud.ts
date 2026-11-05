import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createMeal,
  updateMeal,
  deleteMeal,
  deleteAllMeals,
  bulkCreateMeals,
} from "@/actions/meal-crud";

type MealSnapshot = {
  id: number;
  dailyPlanId: number;
  mealTime: string;
  mealLabel: string;
  content: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
  icon?: string | null;
};

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      data,
    }: {
      dailyPlanId: number;
      data: {
        mealTime: string;
        mealLabel: string;
        content: string;
        calories?: number | null;
        proteinG?: string | null;
        carbsG?: string | null;
        fatG?: string | null;
      };
    }) => createMeal(dailyPlanId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals.byDay"] });
    },
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealId,
      data,
    }: {
      mealId: number;
      data: {
        mealTime: string;
        mealLabel: string;
        content: string;
        calories?: number | null;
        proteinG?: string | null;
        carbsG?: string | null;
        fatG?: string | null;
      };
    }) => updateMeal(mealId, data),
    onMutate: async ({ mealId, data }) => {
      await qc.cancelQueries({ queryKey: ["meals.byDay"] });
      const queries = qc.getQueriesData<MealSnapshot[]>({
        queryKey: ["meals.byDay"],
      });
      for (const [key, cached] of queries) {
        if (Array.isArray(cached)) {
          qc.setQueryData(
            key,
            cached.map((m) =>
              m.id === mealId
                ? {
                    ...m,
                    mealTime: data.mealTime,
                    mealLabel: data.mealLabel,
                    content: data.content,
                    calories: data.calories ?? null,
                    proteinG: data.proteinG ?? null,
                    carbsG: data.carbsG ?? null,
                    fatG: data.fatG ?? null,
                  }
                : m,
            ),
          );
        }
      }
      return { queries };
    },
    onError: (_err, _vars, context) => {
      if (context?.queries) {
        for (const [key, cached] of context.queries) {
          qc.setQueryData(key, cached);
        }
      }
      toast.error("Öğün güncellenemedi");
    },
    onSettled: () => {
      // Mark stale without an immediate refetch — refetching getMealsByDay
      // (a server action) would re-render the route's Server Components and
      // cause a visible full-page refresh. The optimistic patch already shows
      // the change; reconciliation happens on next mount/refetch.
      qc.invalidateQueries({ queryKey: ["meals.byDay"], refetchType: "none" });
    },
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mealId: number) => deleteMeal(mealId),
    onMutate: async (mealId) => {
      await qc.cancelQueries({ queryKey: ["meals.byDay"] });
      const queries = qc.getQueriesData<MealSnapshot[]>({
        queryKey: ["meals.byDay"],
      });
      let snapshot: MealSnapshot | undefined;
      for (const [key, data] of queries) {
        if (Array.isArray(data)) {
          const found = data.find((m) => m.id === mealId);
          if (found) snapshot = found;
          qc.setQueryData(
            key,
            data.filter((m) => m.id !== mealId),
          );
        }
      }
      return { queries, snapshot };
    },
    onError: (_err, _mealId, context) => {
      if (context?.queries) {
        for (const [key, data] of context.queries) {
          qc.setQueryData(key, data);
        }
      }
      toast.error("Öğün silinemedi");
    },
    onSuccess: (_data, _mealId, context) => {
      const snap = context?.snapshot;
      if (!snap) {
        toast.success("Öğün silindi");
        return;
      }
      toast.success(`"${snap.mealLabel}" silindi`, {
        duration: 6000,
        action: {
          label: "Geri Al",
          onClick: async () => {
            try {
              const created = await createMeal(snap.dailyPlanId, {
                mealTime: snap.mealTime,
                mealLabel: snap.mealLabel,
                content: snap.content,
                calories: snap.calories ?? null,
                proteinG: snap.proteinG ?? null,
                carbsG: snap.carbsG ?? null,
                fatG: snap.fatG ?? null,
              });
              const key = ["meals.byDay", snap.dailyPlanId];
              const existing = qc.getQueryData<MealSnapshot[]>(key);
              if (Array.isArray(existing)) {
                qc.setQueryData(key, [
                  ...existing,
                  { ...snap, id: created.id },
                ]);
              }
              qc.invalidateQueries({ queryKey: ["meals.byDay"], refetchType: "none" });
              qc.invalidateQueries({ queryKey: ["today-dashboard"], refetchType: "none" });
              toast.success("Geri alındı");
            } catch {
              toast.error("Geri alma başarısız");
            }
          },
        },
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["meals.byDay"], refetchType: "none" });
      // deleteMeal also strips this meal from any shopping-list references;
      // mark shopping stale so it reconciles when that page is next visited.
      qc.invalidateQueries({ queryKey: ["shopping"], refetchType: "none" });
    },
  });
}

export function useDeleteAllMeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyPlanId: number) => deleteAllMeals(dailyPlanId),
    onMutate: async (dailyPlanId) => {
      await qc.cancelQueries({ queryKey: ["meals.byDay", dailyPlanId] });
      const snapshot = qc.getQueryData<MealSnapshot[]>([
        "meals.byDay",
        dailyPlanId,
      ]);
      qc.setQueryData(["meals.byDay", dailyPlanId], []);
      return { snapshot };
    },
    onError: (_err, dailyPlanId, context) => {
      if (context?.snapshot) {
        qc.setQueryData(["meals.byDay", dailyPlanId], context.snapshot);
      }
      toast.error("Öğünler silinemedi");
    },
    onSuccess: (_data, dailyPlanId, context) => {
      const snap = context?.snapshot;
      const count = snap?.length ?? 0;
      if (!snap || count === 0) {
        toast.success("Öğünler silindi");
        return;
      }
      toast.success(`${count} öğün silindi`, {
        duration: 8000,
        action: {
          label: "Geri Al",
          onClick: async () => {
            try {
              await bulkCreateMeals(
                dailyPlanId,
                snap.map((m) => ({
                  mealTime: m.mealTime,
                  mealLabel: m.mealLabel,
                  content: m.content,
                  calories: m.calories ?? null,
                  proteinG: m.proteinG ?? null,
                  carbsG: m.carbsG ?? null,
                  fatG: m.fatG ?? null,
                })),
              );
              // bulkCreateMeals doesn't return ids; refetch to get fresh rows
              // (re-inserting stale snapshot ids would break toggles).
              qc.invalidateQueries({ queryKey: ["meals.byDay"] });
              qc.invalidateQueries({ queryKey: ["today-dashboard"] });
              toast.success(`${count} öğün geri yüklendi`);
            } catch {
              toast.error("Geri alma başarısız");
            }
          },
        },
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["meals.byDay"], refetchType: "none" });
    },
  });
}
