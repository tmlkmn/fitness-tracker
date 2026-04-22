"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useAiQuota, getQuota } from "@/hooks/use-ai-quota";
import type { AIFeature } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface AiQuotaBadgeProps {
  feature: AIFeature;
  inline?: boolean;
  className?: string;
}

export function AiQuotaBadge({ feature, inline, className }: AiQuotaBadgeProps) {
  const { data, isLoading } = useAiQuota();
  const quota = getQuota(data, feature);

  if (isLoading || !quota) return null;

  const { remaining, limit } = quota;
  const isEmpty = remaining <= 0;
  const isLow = !isEmpty && remaining <= Math.max(1, Math.floor(limit * 0.3));

  const variant = isEmpty ? "destructive" : isLow ? "secondary" : "outline";
  const label = isEmpty ? "Limit doldu" : `${remaining}/${limit}`;

  return (
    <Badge
      variant={variant}
      className={cn(
        "gap-1 px-1.5 py-0 text-[10px] font-medium",
        inline && "ml-auto",
        className,
      )}
      title={isEmpty ? "Günlük AI limitine ulaştın" : `Bugün kalan: ${remaining}/${limit}`}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}
