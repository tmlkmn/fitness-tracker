"use client";

import { useState, useDeferredValue } from "react";
import { useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";
import { isMealLabel, getLocalizedMealLabel } from "@/lib/meal-labels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Dumbbell,
  Home,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  UtensilsCrossed,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { globalSearch } from "@/actions/search";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const t = useTranslations("globalSearch");
  const locale = useLocale() as Locale;
  const NAV_ITEMS: NavItem[] = [
    { label: t("navHome"), href: "/", icon: Home, keywords: ["dashboard", "anasayfa", "home"] },
    { label: t("navCalendar"), href: "/takvim", icon: Calendar, keywords: ["calendar", "hafta", "takvim"] },
    { label: t("navProgress"), href: "/ilerleme", icon: TrendingUp, keywords: ["progress", "grafik", "kilo", "ilerleme"] },
    { label: t("navShopping"), href: "/alisveris", icon: ShoppingCart, keywords: ["shopping", "alışveriş"] },
    { label: t("navMyMeals"), href: "/ogunlerim", icon: BookOpen, keywords: ["meal library", "kayıtlı", "öğün"] },
    { label: t("navAssistant"), href: "/asistan", icon: Sparkles, keywords: ["ai", "chat", "koç", "asistan"] },
    { label: t("navSettings"), href: "/ayarlar", icon: Settings, keywords: ["settings", "profile", "ayarlar"] },
  ];
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery("");
    onOpenChange(next);
  };

  const { data } = useQuery({
    queryKey: ["global-search", deferred],
    queryFn: () => globalSearch(deferred),
    enabled: deferred.trim().length >= 2,
    staleTime: 30_000,
  });

  const q = query.trim().toLowerCase();
  const matchedNav = q
    ? NAV_ITEMS.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.keywords.some((k) => k.toLowerCase().includes(q)),
      )
    : NAV_ITEMS;

  const go = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  const hasResults =
    matchedNav.length > 0 ||
    (data &&
      (data.days.length > 0 ||
        data.meals.length > 0 ||
        data.exercises.length > 0 ||
        data.foods.length > 0));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="sr-only">{t("title")}</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder={t("placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
          {matchedNav.length > 0 && (
            <Section title={t("sectionPages")}>
              {matchedNav.map((n) => {
                const Icon = n.icon;
                return (
                  <Row key={n.href} onClick={() => go(n.href)}>
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{n.label}</span>
                  </Row>
                );
              })}
            </Section>
          )}

          {data && data.days.length > 0 && (
            <Section title={t("sectionDays")}>
              {data.days.map((d) => (
                <Row key={d.id} onClick={() => go(`/gun/${d.id}`)}>
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">
                    {d.dayName}
                    {d.workoutTitle ? ` · ${d.workoutTitle}` : ""}
                  </span>
                  {d.date && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {d.date}
                    </span>
                  )}
                </Row>
              ))}
            </Section>
          )}

          {data && data.meals.length > 0 && (
            <Section title={t("sectionMeals")}>
              {data.meals.map((m) => (
                <Row key={m.id} onClick={() => m.dailyPlanId && go(`/gun/${m.dailyPlanId}`)}>
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">
                    <span className="text-muted-foreground">{isMealLabel(m.mealLabel) ? getLocalizedMealLabel(m.mealLabel, locale) : m.mealLabel}: </span>
                    {m.content}
                  </span>
                  {m.date && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {m.date}
                    </span>
                  )}
                </Row>
              ))}
            </Section>
          )}

          {data && data.exercises.length > 0 && (
            <Section title={t("sectionExercises")}>
              {data.exercises.map((e) => (
                <Row key={e.id} onClick={() => e.dailyPlanId && go(`/gun/${e.dailyPlanId}`)}>
                  <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{e.name}</span>
                  {e.date && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {e.date}
                    </span>
                  )}
                </Row>
              ))}
            </Section>
          )}

          {data && data.foods.length > 0 && (
            <Section title={t("sectionFoods")}>
              {data.foods.map((f) => (
                <Row
                  key={f.id}
                  onClick={() => go("/ogunlerim")}
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">
                    {f.name}
                    <span className="text-muted-foreground"> · {f.portion}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {f.calories} kcal
                  </span>
                </Row>
              ))}
            </Section>
          )}

          {q && !hasResults && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t("noResults")}
            </p>
          )}
        </div>

        <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground flex justify-between">
          <span>{t("shortcutHint")}: <kbd className="rounded bg-muted px-1">Ctrl</kbd> + <kbd className="rounded bg-muted px-1">K</kbd></span>
          <span>{t("escHint")}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-left hover:bg-accent transition-colors"
    >
      {children}
    </button>
  );
}
