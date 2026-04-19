"use client";

import { useState } from "react";
import { useSupplementsByWeek } from "@/hooks/use-plans";
import { useSupplementCompletions, useToggleSupplementCompletion } from "@/hooks/use-supplement-completions";
import { useDeleteSupplement } from "@/hooks/use-supplement-crud";
import { SupplementCard } from "./supplement-card";
import { SupplementFormDialog } from "./supplement-form-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Pill, Plus } from "lucide-react";

interface SupplementTimelineProps {
  weeklyPlanId: number;
  date?: string;
  readOnly?: boolean;
}

export function SupplementTimeline({ weeklyPlanId, date, readOnly }: SupplementTimelineProps) {
  const { data: supplements, isLoading } = useSupplementsByWeek(weeklyPlanId);
  const { data: completedIds } = useSupplementCompletions(
    weeklyPlanId,
    date ?? "",
  );
  const toggleCompletion = useToggleSupplementCompletion();
  const deleteSupplement = useDeleteSupplement();

  const [addOpen, setAddOpen] = useState(false);
  const [editSupplement, setEditSupplement] = useState<{
    id: number;
    name: string;
    dosage: string;
    timing: string;
    notes?: string | null;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!supplements?.length) {
    return (
      <>
        <div className="text-center py-8 space-y-3">
          <Pill className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
          <p className="text-sm text-muted-foreground">
            Bu hafta supplement yok
          </p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Supplement Ekle
            </Button>
          )}
        </div>
        {addOpen && (
          <SupplementFormDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            weeklyPlanId={weeklyPlanId}
          />
        )}
      </>
    );
  }

  const completedSet = new Set(completedIds ?? []);

  return (
    <>
      <div className="space-y-2">
        {supplements.map((s) => (
          <SupplementCard
            key={s.id}
            id={s.id}
            name={s.name}
            dosage={s.dosage}
            timing={s.timing}
            notes={s.notes}
            isCompleted={date ? completedSet.has(s.id) : undefined}
            onToggle={
              date && !readOnly
                ? (id, completed) =>
                    toggleCompletion.mutate({
                      supplementId: id,
                      date: date!,
                      completed,
                    })
                : undefined
            }
            onEdit={
              !readOnly
                ? (id) => {
                    const sup = supplements.find((x) => x.id === id);
                    if (sup) setEditSupplement(sup);
                  }
                : undefined
            }
            onDelete={
              !readOnly
                ? (id) => deleteSupplement.mutate(id)
                : undefined
            }
            readOnly={readOnly}
          />
        ))}
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Supplement Ekle
          </Button>
        )}
      </div>

      {addOpen && (
        <SupplementFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          weeklyPlanId={weeklyPlanId}
        />
      )}

      {editSupplement && (
        <SupplementFormDialog
          open={!!editSupplement}
          onOpenChange={(open) => {
            if (!open) setEditSupplement(null);
          }}
          weeklyPlanId={weeklyPlanId}
          supplement={editSupplement}
        />
      )}
    </>
  );
}
