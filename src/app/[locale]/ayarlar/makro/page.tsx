"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { MacroTargetsCard } from "@/components/meals/macro-targets-card";
import { AIMacroCalculator } from "@/components/meals/ai-macro-calculator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, Flame, Beef, Wheat, Droplets, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const MACRO_KEYS = [
  { icon: Flame, key: "calorie" as const, color: "text-orange-400", bg: "bg-orange-400/10" },
  { icon: Beef, key: "protein" as const, color: "text-red-400", bg: "bg-red-400/10" },
  { icon: Wheat, key: "carbs" as const, color: "text-amber-400", bg: "bg-amber-400/10" },
  { icon: Droplets, key: "fat" as const, color: "text-blue-400", bg: "bg-blue-400/10" },
];

function MacroInfoCard() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("settings.macros");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("infoTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("infoSubtitle")}</p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("intro")}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {MACRO_KEYS.map(({ icon: Icon, key, color, bg }) => (
                <div key={key} className={cn("rounded-lg p-3 space-y-2", bg)}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4 shrink-0", color)} />
                    <span className="text-xs font-semibold">{t(`${key}Label`)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t(`${key}Desc`)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground">{t("perGramTitle")}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><span className="text-red-400 font-medium">{t("proteinLabel")}</span> → 4 kcal/g</span>
                <span><span className="text-amber-400 font-medium">{t("carbsLabelShort")}</span> → 4 kcal/g</span>
                <span><span className="text-blue-400 font-medium">{t("fatLabel")}</span> → 9 kcal/g</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">{t("tipPrefix")}</span> {t("tipBody")}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function MakroPage() {
  const t = useTranslations("settings.subpages");
  return (
    <div className="animate-fade-in">
      <Header
        title={t("macroTitle")}
        subtitle={t("macroSubtitle")}
        icon={Target}
        showBack
        backHref="/ayarlar"
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        <MacroInfoCard />
        <AIMacroCalculator />
        <MacroTargetsCard />
      </div>
    </div>
  );
}
