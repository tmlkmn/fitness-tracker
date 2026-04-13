"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateMealVariation } from "@/actions/ai";

interface AiSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealLabel: string;
  currentContent: string;
}

export function AiSuggestionModal({
  open,
  onOpenChange,
  mealLabel,
  currentContent,
}: AiSuggestionModalProps) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);

  const generateSuggestion = async () => {
    setLoading(true);
    try {
      const result = await generateMealVariation(mealLabel, currentContent);
      setSuggestion(result.suggestion);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Öğün Önerisi
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">
              Mevcut öğün:
            </p>
            <p className="text-sm font-medium">{mealLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentContent}
            </p>
          </div>
          {suggestion && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-primary mb-1">✨ Öneri:</p>
              <p className="text-sm">{suggestion}</p>
            </div>
          )}
          <Button
            onClick={generateSuggestion}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {suggestion ? "Yeni Öneri Al" : "Öneri Al"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
