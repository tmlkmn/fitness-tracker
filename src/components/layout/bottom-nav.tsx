"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  TrendingUp,
  Bot,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", matchPaths: ["/"], icon: Home, label: "Ana" },
  {
    href: "/takvim",
    matchPaths: ["/takvim", "/gun"],
    icon: Calendar,
    label: "Takvim",
  },
  {
    href: "/asistan",
    matchPaths: ["/asistan"],
    icon: Bot,
    label: "Asistan",
  },
  {
    href: "/ilerleme",
    matchPaths: ["/ilerleme"],
    icon: TrendingUp,
    label: "İlerleme",
  },
  {
    href: "/ayarlar",
    matchPaths: ["/ayarlar", "/alisveris"],
    icon: Settings,
    label: "Ayarlar",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const hiddenPaths = ["/giris", "/bekliyor", "/sifre-degistir", "/sifremi-unuttum", "/sifre-sifirla", "/admin", "/profil-tamamla", "/uyelik-doldu", "/gizlilik", "/kvkk", "/kullanim-sartlari", "/tanitim"];
  if (hiddenPaths.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav aria-label="Ana navigasyon" className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, matchPaths, icon: Icon, label }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : matchPaths.some((p) => pathname.startsWith(p));
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[3.5rem]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
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
