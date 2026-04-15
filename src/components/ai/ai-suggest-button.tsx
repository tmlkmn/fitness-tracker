"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AiSuggestionModal } from "./ai-suggestion-modal";

interface AiSuggestButtonProps {
  mealLabel: string;
  currentContent: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
}

export function AiSuggestButton({
  mealLabel,
  currentContent,
  calories,
  proteinG,
  carbsG,
  fatG,
}: AiSuggestButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-3 w-3" />
        AI ile Çeşitlendir
      </Button>
      <AiSuggestionModal
        open={open}
        onOpenChange={setOpen}
        mealLabel={mealLabel}
        currentContent={currentContent}
        calories={calories}
        proteinG={proteinG}
        carbsG={carbsG}
        fatG={fatG}
      />
    </>
  );
}
