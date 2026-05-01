"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";

export interface GeneratingStep {
  label: string;
  status: "completed" | "active" | "pending";
}

interface AiGeneratingOverlayProps {
  open: boolean;
  title?: string;
  steps: GeneratingStep[];
}

export function AiGeneratingOverlay({
  open,
  title = "AI programını hazırlıyor",
  steps,
}: AiGeneratingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-200 bg-background flex flex-col items-center justify-center px-8">
      {/* Ripple animation */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-primary/30"
            style={{
              width: 72,
              height: 72,
              animation: `ai-ripple 2.7s ease-out ${i * 0.9}s infinite`,
            }}
          />
        ))}
        {/* Central circle */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-xl font-semibold text-foreground text-center mb-2">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-10">
        Verilerini analiz ediyoruz, bu birkaç dakika sürebilir.
      </p>

      {/* Step list */}
      <div className="w-full max-w-xs space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={`flex-1 text-sm ${
                step.status === "completed"
                  ? "text-primary"
                  : step.status === "active"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
              {step.status === "active" && (
                <span className="inline-block ml-1 tracking-widest">...</span>
              )}
            </span>
            {step.status === "completed" && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}
