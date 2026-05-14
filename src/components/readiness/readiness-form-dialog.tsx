"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUpsertReadiness } from "@/hooks/use-readiness";
import type { ReadinessLogRow } from "@/actions/readiness";

interface ReadinessFormDialogProps {
  onClose: () => void;
  initial?: ReadinessLogRow | null;
  onSaved?: () => void;
}

function ChipRow({
  value,
  onChange,
  lowLabel,
  highLabel,
}: Readonly<{
  value: number | null;
  onChange: (next: number | null) => void;
  lowLabel: string;
  highLabel: string;
}>) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? null : n)}
              className={`flex-1 h-10 rounded-md text-sm font-semibold transition-colors tabular-nums ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              aria-pressed={active}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function ReadinessFormDialog({
  onClose,
  initial,
  onSaved,
}: Readonly<ReadinessFormDialogProps>) {
  const t = useTranslations("readiness.form");
  const [energy, setEnergy] = useState<number | null>(
    initial?.energyRating ?? null,
  );
  const [pain, setPain] = useState<number | null>(initial?.painScore ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const upsert = useUpsertReadiness();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await upsert.mutateAsync({
        energyRating: energy,
        painScore: pain,
        notes: notes.trim() || null,
      });
      onSaved?.();
      onClose();
    } catch {
      setError(t("saveError"));
    }
  };

  const loading = upsert.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">{t("title")}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t("energyLabel")}
              </label>
              <ChipRow
                value={energy}
                onChange={setEnergy}
                lowLabel={t("energyLow")}
                highLabel={t("energyHigh")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t("painLabel")}
              </label>
              <ChipRow
                value={pain}
                onChange={setPain}
                lowLabel={t("painNone")}
                highLabel={t("painSevere")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t("notesLabel")}
              </label>
              <textarea
                rows={2}
                maxLength={200}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || (energy == null && pain == null)}
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("submit")
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
