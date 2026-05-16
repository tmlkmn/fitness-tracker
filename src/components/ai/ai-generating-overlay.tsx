"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Check, Loader2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export interface GeneratingStep {
  label: string;
  status: "completed" | "active" | "pending";
  /** Optional sub-text rendered beneath an active step — e.g. a retry notice. */
  detail?: string;
}

interface AiGeneratingOverlayProps {
  open: boolean;
  title?: string;
  steps: GeneratingStep[];
  /** When true, shows a live elapsed-time counter under the step list. */
  showElapsed?: boolean;
}

/**
 * Live elapsed-time counter. Mounted only while the overlay is open so each
 * generation gets a fresh start; the timer's start instant is captured inside
 * the effect (not during render) to satisfy the React purity lint rules.
 */
function ElapsedCounter() {
  const t = useTranslations("assistant.generating");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.floor(elapsed / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const label =
    minutes > 0
      ? t("elapsedMin", { minutes, seconds })
      : t("elapsedSec", { seconds });

  return (
    <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
      <Clock className="h-3.5 w-3.5" />
      {label}
    </p>
  );
}

export function AiGeneratingOverlay({
  open,
  title,
  steps,
  showElapsed = false,
}: AiGeneratingOverlayProps) {
  const t = useTranslations("assistant.generating");
  const [mounted, setMounted] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Screen wake lock — long AI generations (1-5 min) outlast the default
  // mobile screen timeout; keep the device awake while the overlay is up.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const acquire = () => {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        navigator.wakeLock
          .request("screen")
          .then((lock) => {
            if (cancelled) {
              lock.release().catch(() => {});
              return;
            }
            wakeLockRef.current = lock;
          })
          .catch(() => {});
      }
    };

    acquire();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [open]);

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
        {title ?? t("defaultTitle")}
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-10">
        {t("subtitle")}
      </p>

      {/* Step list */}
      <div className="w-full max-w-xs space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
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
              {step.status === "completed" ? (
                <Check className="h-4 w-4 text-primary shrink-0" />
              ) : step.status === "active" ? (
                <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
              ) : null}
            </div>
            {step.status === "active" && step.detail && (
              <span className="ml-8 text-xs text-primary/80">
                {step.detail}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Elapsed counter */}
      {showElapsed && <ElapsedCounter />}
    </div>,
    document.body
  );
}
