"use client";

import { useTranslations } from "next-intl";
import {
  Rocket,
  X,
  CheckCircle2,
  ChevronRight,
  User,
  CalendarPlus,
  Scale,
  Bot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { useUserProfile } from "@/hooks/use-user";
import { useAllWeeks } from "@/hooks/use-plans";
import { useProgressLogCount } from "@/hooks/use-progress";
import { useOnboardingStorage } from "@/hooks/use-onboarding-storage";

const ITEM_ICONS = {
  profile: User,
  weeklyPlan: CalendarPlus,
  weightLog: Scale,
  assistant: Bot,
} as const;

type ItemKey = keyof typeof ITEM_ICONS;

const ITEM_HREFS: Record<ItemKey, "/profil-tamamla" | "/takvim" | "/ilerleme" | "/asistan"> = {
  profile: "/profil-tamamla",
  weeklyPlan: "/takvim",
  weightLog: "/ilerleme",
  assistant: "/asistan",
};

/**
 * Dashboard card nudging a new user through their first real actions. Items
 * are derived from live data (React Query) and check off automatically. The
 * card hides itself once every item is done, or when dismissed.
 */
export function GettingStartedChecklist() {
  const t = useTranslations("onboarding.checklist");
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: weeks, isLoading: weeksLoading } = useAllWeeks();
  const { data: logCount, isLoading: countLoading } = useProgressLogCount();
  const { aiVisited, checklistDismissed, dismissChecklist } = useOnboardingStorage();

  // Avoid a flash of an incomplete checklist before data settles.
  if (profileLoading || weeksLoading || countLoading) return null;
  if (checklistDismissed) return null;

  const items: { key: ItemKey; done: boolean }[] = [
    {
      key: "profile",
      done: !!(profile?.height && profile?.weight && profile?.targetWeight),
    },
    { key: "weeklyPlan", done: (weeks?.length ?? 0) > 0 },
    { key: "weightLog", done: (logCount ?? 0) > 0 },
    { key: "assistant", done: aiVisited },
  ];

  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <Card
      data-tour="getting-started"
      className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent"
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold truncate">{t("title")}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums">
              {doneCount}/{items.length}
            </span>
            <button
              type="button"
              onClick={dismissChecklist}
              aria-label={t("dismiss")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="space-y-1">
          {items.map(({ key, done }) => {
            const Icon = ITEM_ICONS[key];
            const label = t(`items.${key}.label`);
            const description = t(`items.${key}.description`);

            if (done) {
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground line-through">
                    {label}
                  </span>
                </li>
              );
            }

            return (
              <li key={key}>
                <Link
                  href={ITEM_HREFS[key]}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors"
                >
                  <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
