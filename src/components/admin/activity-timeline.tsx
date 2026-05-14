"use client";

import { useTranslations, useLocale } from "next-intl";
import { LogIn, Sparkles, LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/lib/locale";
import { useTimeAgo } from "./admin-labels";

export function ActivityTimeline({
  lastSessionAt,
  lastAiAt,
  lastProgressLogAt,
}: {
  lastSessionAt: Date | null;
  lastAiAt: Date | null;
  lastProgressLogAt: Date | null;
}) {
  const t = useTranslations("admin.userDetail");
  const tEvent = useTranslations("admin.userDetail.timelineEvents");
  const locale = useLocale() as Locale;
  const formatAgo = useTimeAgo();

  const items: { label: string; Icon: typeof LogIn; at: Date | null }[] = [
    { label: tEvent("lastSession"), Icon: LogIn, at: lastSessionAt },
    { label: tEvent("lastAi"), Icon: Sparkles, at: lastAiAt },
    { label: tEvent("lastProgressLog"), Icon: LineChart, at: lastProgressLogAt },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">{t("timeline")}</h3>
        <div className="grid grid-cols-3 gap-2">
          {items.map(({ label, Icon, at }) => (
            <div
              key={label}
              className="flex flex-col items-start gap-1 rounded-md bg-muted/40 p-2.5"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                {label}
              </p>
              <p className="text-xs font-medium tabular-nums">
                {at
                  ? formatAgo(at)
                  : tEvent("never")}
              </p>
              {at && (
                <p className="text-[9px] text-muted-foreground tabular-nums">
                  {at.toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
