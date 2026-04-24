"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2, AlertCircle } from "lucide-react";
import { useExerciseFormTips } from "@/hooks/use-exercise-form-tips";
import { formatAiError } from "@/lib/ai-errors";
import ReactMarkdown from "react-markdown";

interface ExerciseFormTipsProps {
  name: string;
  notes?: string | null;
  englishName?: string | null;
}

export function ExerciseFormTips({ name, notes, englishName }: ExerciseFormTipsProps) {
  const [open, setOpen] = useState(false);

  const {
    data,
    isLoading,
    error: queryError,
  } = useExerciseFormTips(name, notes ?? null, open, englishName ?? null);

  const errorMessage = queryError ? formatAiError(queryError) : null;

  const tips = data?.tips ?? "";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 text-muted-foreground hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="max-w-lg w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-sm">
                Form İpuçları: {name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {errorMessage && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}
              {tips && !isLoading && (
                <div className="p-3 bg-muted rounded-lg text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h3 className="text-sm font-bold text-primary mt-3 mb-1.5 first:mt-0">{children}</h3>
                      ),
                      h2: ({ children }) => (
                        <h4 className="text-sm font-bold text-primary mt-3 mb-1.5 first:mt-0">{children}</h4>
                      ),
                      h3: ({ children }) => (
                        <h4 className="text-sm font-semibold text-primary mt-2.5 mb-1 first:mt-0">{children}</h4>
                      ),
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-2 last:mb-0 space-y-1 ml-0.5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-2 last:mb-0 space-y-1 ml-0.5 list-decimal list-inside">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="flex gap-1.5 items-start">
                          <span className="text-primary mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-primary/60 inline-block" />
                          <span className="flex-1">{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-muted-foreground italic">{children}</em>
                      ),
                      code: ({ children }) => (
                        <code className="bg-background/50 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                      ),
                      hr: () => (
                        <hr className="border-border/50 my-2" />
                      ),
                    }}
                  >
                    {tips}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
