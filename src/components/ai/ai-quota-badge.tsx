"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useAiQuota, getQuota } from "@/hooks/use-ai-quota";
import type { AIFeature } from "@/lib/ai";
import { cn } from "@/lib/utils";
import {
  formatTimeUntilReset,
  getNextQuotaReset,
} from "@/lib/quota-reset";

interface AiQuotaBadgeProps {
  feature: AIFeature;
  inline?: boolean;
  className?: string;
}

export function AiQuotaBadge({ feature, inline, className }: AiQuotaBadgeProps) {
  const { data, isLoading } = useAiQuota();
  const quota = getQuota(data, feature);

  const [now, setNow] = useState(() => Date.now());
  const isEmpty = quota !== null && quota.remaining <= 0;
  useEffect(() => {
    if (!isEmpty) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [isEmpty]);

  if (isLoading || !quota) return null;

  const { remaining, limit } = quota;
  const isLow = !isEmpty && remaining <= Math.max(1, Math.floor(limit * 0.3));

  const variant = isEmpty ? "destructive" : isLow ? "secondary" : "outline";
  const resetAt = getNextQuotaReset();
  const countdown = formatTimeUntilReset(resetAt, now);
  const label = isEmpty ? `${countdown} sonra` : `${remaining}/${limit}`;
  const title = isEmpty
    ? `Günlük AI limitine ulaştın — ${countdown} sonra yenilenir`
    : `Bugün kalan: ${remaining}/${limit} · sıfırlanma: ${countdown} sonra`;

  return (
    <Badge
      variant={variant}
      className={cn(
        "gap-1 px-1.5 py-0 text-[10px] font-medium tabular-nums",
        inline && "ml-auto",
        className,
      )}
      title={title}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}
