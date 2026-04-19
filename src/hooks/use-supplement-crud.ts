import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSupplement,
  updateSupplement,
  deleteSupplement,
} from "@/actions/supplement-crud";

export function useCreateSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      weeklyPlanId,
      data,
    }: {
      weeklyPlanId: number;
      data: {
        name: string;
        dosage: string;
        timing: string;
        notes?: string | null;
      };
    }) => createSupplement(weeklyPlanId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}

export function useUpdateSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplementId,
      data,
    }: {
      supplementId: number;
      data: {
        name: string;
        dosage: string;
        timing: string;
        notes?: string | null;
      };
    }) => updateSupplement(supplementId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}

export function useDeleteSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (supplementId: number) => deleteSupplement(supplementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}
