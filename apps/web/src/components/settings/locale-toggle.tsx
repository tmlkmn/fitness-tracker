"use client";

import { useTransition, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Globe, Loader2 } from "lucide-react";
import { updateUserLocale } from "@/actions/locale";
import type { Locale } from "@/lib/locale";
import { Card, CardContent } from "@/components/ui/card";

const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

export function LocaleToggle() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("settings.locale");
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Locale | null>(null);

  const handleSelect = (next: Locale) => {
    if (next === currentLocale || pending) return;
    setTarget(next);
    startTransition(async () => {
      try {
        await updateUserLocale(next);
        router.replace(pathname, { locale: next });
        router.refresh();
      } finally {
        setTarget(null);
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("label")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
        <div className="grid grid-cols-2 gap-2">
          {(["tr", "en"] as const).map((locale) => {
            const isActive = locale === currentLocale;
            const isLoading = pending && target === locale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleSelect(locale)}
                disabled={pending}
                className={
                  "inline-flex items-center justify-center gap-2 h-10 rounded-md border text-sm font-medium transition-colors disabled:opacity-60 " +
                  (isActive
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-input hover:bg-accent")
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{LOCALE_LABELS[locale]}</span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
