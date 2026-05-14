"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, Edit3, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTodayReadinessLog } from "@/hooks/use-readiness";
import { ReadinessFormDialog } from "./readiness-form-dialog";
import { useSuccessPulse } from "@/hooks/use-success-pulse";

export function ReadinessEntry({
  autoOpen = false,
}: Readonly<{ autoOpen?: boolean }>) {
  const t = useTranslations("readiness.entry");
  const { data: log, isLoading } = useTodayReadinessLog();
  const [open, setOpen] = useState(false);
  const pulse = useSuccessPulse();
  const autoOpenConsumedRef = useRef(false);

  const hasEntry = log != null && (log.energyRating != null || log.painScore != null);

  // Auto-open the form ONLY if there's no entry yet for today. Gated on the
  // query resolving (isLoading=false) so we don't open prematurely while
  // log is still undefined; gated on a ref so the effect runs at most once
  // per mount even when log refetches or pulses re-render the tree.
  useEffect(() => {
    if (autoOpenConsumedRef.current) return;
    if (!autoOpen || isLoading) return;
    autoOpenConsumedRef.current = true;
    if (!hasEntry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, [autoOpen, isLoading, hasEntry]);

  return (
    <>
      <Card key={pulse.pulseKey || undefined} className={pulse.pulseClass}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">
              {hasEntry ? t("summaryTitle") : t("promptTitle")}
            </h3>
          </div>

          {hasEntry ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {log.energyRating != null && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 tabular-nums">
                    {t("energyValue", { value: log.energyRating })}
                  </span>
                )}
                {log.painScore != null && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 tabular-nums">
                    {t("painValue", { value: log.painScore })}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors"
              >
                <Edit3 className="h-3 w-3" />
                {t("edit")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("promptBody")}</p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-9 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                {t("promptCta")}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {open && (
        <ReadinessFormDialog
          onClose={() => setOpen(false)}
          initial={log ?? undefined}
          onSaved={() => pulse.trigger()}
        />
      )}
    </>
  );
}
