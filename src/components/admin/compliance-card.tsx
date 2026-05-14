"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import type { ComplianceStats } from "@/actions/admin-user-detail";

type Window = "7" | "14" | "30";

export function ComplianceCard({
  last7,
  last14,
  last30,
}: {
  last7: ComplianceStats;
  last14: ComplianceStats;
  last30: ComplianceStats;
}) {
  const t = useTranslations("admin.userDetail");
  const [window, setWindow] = useState<Window>("7");

  const map: Record<Window, ComplianceStats> = {
    "7": last7,
    "14": last14,
    "30": last30,
  };
  const current = map[window];

  const pct = current.ratio == null ? null : Math.round(current.ratio * 100);
  const bandColor =
    pct == null
      ? "bg-muted"
      : pct < 50
        ? "bg-destructive"
        : pct < 80
          ? "bg-amber-500"
          : "bg-emerald-500";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t("compliance")}
          </h3>
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            {(["7", "14", "30"] as Window[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindow(w)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  window === w
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(
                  w === "7"
                    ? "complianceTab7"
                    : w === "14"
                      ? "complianceTab14"
                      : "complianceTab30",
                )}
              </button>
            ))}
          </div>
        </div>

        {pct == null ? (
          <p className="text-sm text-muted-foreground">
            {t("complianceEmpty")}
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold tabular-nums">{pct}%</p>
                <p className="text-xs text-muted-foreground">
                  {t("complianceMeals", {
                    done: current.mealsDone,
                    total: current.mealsTotal,
                  })}{" "}
                  ·{" "}
                  {t("complianceExercises", {
                    done: current.exercisesDone,
                    total: current.exercisesTotal,
                  })}
                </p>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${bandColor}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
