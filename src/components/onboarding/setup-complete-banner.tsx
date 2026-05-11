"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { X, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

function BannerInner() {
  const t = useTranslations("onboarding.setupBanner");
  const searchParams = useSearchParams();
  const justSetup = searchParams.get("setup") === "done";
  const [dismissed, setDismissed] = useState(false);

  if (!justSetup || dismissed) return null;

  return (
    <div className="rounded-xl bg-linear-to-br from-primary/15 to-primary/5 border border-primary/25 p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t("description")}
          </p>
          <Button asChild size="sm" className="mt-3 gap-1.5 h-8">
            <Link href="/takvim">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("goToCalendar")}
            </Link>
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t("close")}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SetupCompleteBanner() {
  return (
    <Suspense>
      <BannerInner />
    </Suspense>
  );
}
