"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyWeeklyPlan,
  deleteWeeklyPlan as deleteWeeklyPlanAction,
  type AIWeeklyPlan,
} from "@/actions/ai-weekly";
import type { DayModeChoice } from "@/lib/ai-weekly-types";
import {
  getSavedSuggestions,
  getSavedSuggestionById,
  deleteSavedSuggestion as deleteSavedSuggestionAction,
} from "@/actions/ai-suggestions";

export type GenerationStep = "profile" | "nutrition" | "workout" | "merging";

export function useGenerateWeeklyPlan() {
  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState<AIWeeklyPlan | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [step, setStep] = useState<GenerationStep | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const mutate = useCallback(async ({
    dateStr,
    userNote,
    generateMode,
    dayModes,
    pastDows,
  }: {
    dateStr: string;
    userNote?: string;
    generateMode?: "both" | "nutrition" | "workout";
    dayModes?: Partial<Record<number, DayModeChoice>>;
    pastDows?: number[];
  }) => {
    controllerRef.current?.abort();

    setIsPending(true);
    setData(null);
    setError(null);
    setStep(null);

    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 300_000);

    try {
      const res = await fetch("/api/ai/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateStr, userNote, generateMode, dayModes, pastDows }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "Bir hata oluştu.");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          const event = JSON.parse(jsonStr) as {
            type: "status" | "done" | "error";
            step?: GenerationStep;
            suggestedPlan?: AIWeeklyPlan;
            error?: string;
          };

          if (event.type === "status" && event.step) {
            setStep(event.step);
          } else if (event.type === "done" && event.suggestedPlan) {
            setData(event.suggestedPlan);
            setIsPending(false);
            setStep(null);
            return;
          } else if (event.type === "error") {
            throw new Error(event.error ?? "Bir hata oluştu.");
          }
        }
      }

      // Stream ended without "done" — treat as error
      setIsPending(false);
      setStep(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(new Error("İşlem zaman aşımına uğradı. Lütfen tekrar deneyin."));
      } else {
        setError(err instanceof Error ? err : new Error("Bir hata oluştu."));
      }
      setIsPending(false);
      setStep(null);
    } finally {
      clearTimeout(timeout);
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsPending(false);
    setData(null);
    setError(null);
    setStep(null);
  }, []);

  return { isPending, data, error, step, mutate, reset };
}

export function useApplyWeeklyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dateStr,
      plan,
      applyMode,
    }: {
      dateStr: string;
      plan: AIWeeklyPlan;
      applyMode?: "both" | "nutrition" | "workout";
    }) => applyWeeklyPlan(dateStr, plan, applyMode),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["plans"] });
      qc.refetchQueries({ queryKey: ["meals.byDay"] });
      qc.refetchQueries({ queryKey: ["exercises"] });
      qc.refetchQueries({ queryKey: ["today-dashboard"] });
      qc.refetchQueries({ queryKey: ["week-plans-date"] });
    },
  });
}

export function useDeleteWeeklyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weeklyPlanId: number) => deleteWeeklyPlanAction(weeklyPlanId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["week-plans-date"] });
      await qc.cancelQueries({ queryKey: ["today-dashboard"] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["weeks"] });
      qc.invalidateQueries({ queryKey: ["week-plans-date"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dates-with-plans"] });
    },
  });
}

// ─── Saved AI Suggestions ──────────────────────────────────────────────────

export function useSavedSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: ["ai-suggestions"],
    queryFn: () => getSavedSuggestions(),
    enabled,
    staleTime: 60_000,
  });
}

export function useSavedSuggestionDetail(id: number | null) {
  return useQuery({
    queryKey: ["ai-suggestion", id],
    queryFn: () => getSavedSuggestionById(id!),
    enabled: id !== null,
  });
}

export function useDeleteSavedSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSavedSuggestionAction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions"] });
    },
  });
}
