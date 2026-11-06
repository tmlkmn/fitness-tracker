"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Bot } from "lucide-react";
import { hasAiConsent } from "@fitmusc/shared/consent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useConsents, useSetConsents } from "@/hooks/use-consents";

/**
 * Renders an AI feature only once the user allowed sending their data to
 * Anthropic; until then it shows what is sent and asks. Nothing inside runs
 * (no auto-fetching query, no button) before that. The server enforces the
 * same rule in checkRateLimit, so this is the UX, not the boundary.
 */
export function AiConsentGate({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  const t = useTranslations("consent.aiGate");
  const consents = useConsents();
  const save = useSetConsents();

  if (consents.isLoading) return <Skeleton className="h-28 w-full rounded-lg" />;
  // Unknown (e.g. offline): let the feature render; the server still decides.
  if (consents.isError || hasAiConsent(consents.data?.aiConsentAt)) return <>{children}</>;

  return (
    <div className={cn("rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">{t("title")}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t("body")}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={save.isPending} onClick={() => save.mutate({ ai: true })}>
          {t("allow")}
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link href="/gizlilik" target="_blank">
            {t("details")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
