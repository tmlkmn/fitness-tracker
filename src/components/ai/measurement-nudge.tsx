"use client";

import Link from "next/link";
import { LineChart } from "lucide-react";
import { useProgressLogCount } from "@/hooks/use-progress";

interface MeasurementNudgeProps {
  compact?: boolean;
}

export function MeasurementNudge({ compact }: MeasurementNudgeProps) {
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
          Ölçüm eklemek önerileri geliştirir
        </p>
        <p
          className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground mt-0.5`}
        >
          Kilo, yağ oranı ve bel ölçünüz AI&apos;ın size özel makro ve antrenman
          hacmi belirlemesini sağlar.{" "}
          <Link
            href="/ilerleme"
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            Ölçüm ekle
          </Link>
        </p>
      </div>
    </div>
  );
}
