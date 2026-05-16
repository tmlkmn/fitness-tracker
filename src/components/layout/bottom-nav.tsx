"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  Calendar,
  TrendingUp,
  Bot,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/" as const, matchPaths: ["/"], icon: Home, labelKey: "home" as const },
  {
    href: "/takvim" as const,
    matchPaths: ["/takvim", "/gun"],
    icon: Calendar,
    labelKey: "calendar" as const,
  },
  {
    href: "/asistan" as const,
    matchPaths: ["/asistan"],
    icon: Bot,
    labelKey: "assistant" as const,
  },
  {
    href: "/ilerleme" as const,
    matchPaths: ["/ilerleme"],
    icon: TrendingUp,
    labelKey: "progress" as const,
  },
  {
    href: "/ayarlar" as const,
    matchPaths: ["/ayarlar"],
    icon: Settings,
    labelKey: "settings" as const,
  },
];

const HIDDEN_PATHS = [
  "/giris",
  "/bekliyor",
  "/sifre-degistir",
  "/sifremi-unuttum",
  "/sifre-sifirla",
  "/admin",
  "/profil-tamamla",
  "/uyelik-doldu",
  "/gizlilik",
  "/kvkk",
  "/kullanim-sartlari",
  "/tanitim",
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav aria-label={t("primaryNavigation")} className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, matchPaths, icon: Icon, labelKey }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : matchPaths.some((p) => pathname.startsWith(p));
          return (
            <Link
              key={href}
              href={href}
              data-tour={`nav-${labelKey}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[3.5rem]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{t(labelKey)}</span>
              {isActive && (
                <span className="h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
