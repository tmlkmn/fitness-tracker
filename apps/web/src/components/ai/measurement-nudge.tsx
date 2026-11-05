"use client";

import { Link } from "@/i18n/navigation";
import { LineChart } from "lucide-react";
import { useProgressLogCount } from "@/hooks/use-progress";
import { useTranslations } from "next-intl";

interface MeasurementNudgeProps {
  compact?: boolean;
}

export function MeasurementNudge({ compact }: MeasurementNudgeProps) {
  const t = useTranslations("assistant.measurementNudge");
  const { data: count, isLoading } = useProgressLogCount();
  if (isLoading || (count ?? 0) > 0) return null;

  return (
    <div
      className={`rounded-lg border border-primary/30 bg-primary/5 ${
        compact ? "p-2.5" : "p-3"
      } flex items-start gap-2`}
    >
      <LineChart
        className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-primary shrink-0 mt-0.5`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`${compact ? "text-xs" : "text-sm"} font-medium text-primary`}
        >
          {t("title")}
        </p>
        <p
          className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground mt-0.5`}
        >
          {t("body")}{" "}
          <Link
            href="/ilerleme"
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            {t("link")}
          </Link>
        </p>
      </div>
    </div>
  );
}
