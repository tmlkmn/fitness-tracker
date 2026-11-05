"use client";

import { Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Small inline footnote shown once under any AI-generated surface (chat, meal
 * variations, exercise tips, progress analysis). Reminds users that AI output
 * may be wrong and is not medical advice, linking to the full disclaimer page.
 */
export function AiDisclaimer({ className }: { className?: string }) {
  const t = useTranslations("disclaimer");
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground",
        className,
      )}
    >
      <Info className="h-3 w-3 shrink-0 mt-0.5" />
      <span>
        {t("ai")}{" "}
        <Link href="/feragatname" className="underline hover:text-foreground">
          {t("moreInfo")} &rarr;
        </Link>
      </span>
    </p>
  );
}
