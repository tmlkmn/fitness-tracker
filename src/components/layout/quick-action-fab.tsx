"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  X,
  Utensils,
  Dumbbell,
  Bot,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { useTodayDashboard } from "@/hooks/use-plans";
import { useSession } from "@/lib/auth-client";
import { hapticTap } from "@/lib/haptics";

const HIDDEN_PATH_PREFIXES = [
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

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

export function QuickActionFab() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  if (isPending || !session?.user) return null;
  if (HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return <QuickActionFabInner pathname={pathname} />;
}

function QuickActionFabInner({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: today } = useTodayDashboard();
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const todayHref = today?.dailyPlan ? `/gun/${today.dailyPlan.id}` : "/takvim";
  const isOnTodayPage =
    today?.dailyPlan && pathname === `/gun/${today.dailyPlan.id}`;

  const actions: QuickAction[] = [
    {
      label: "AI Asistan",
      icon: Bot,
      href: "/asistan",
      color: "bg-violet-500/15 text-violet-400",
    },
    {
      label: "Antrenman",
      icon: Dumbbell,
      href: `${todayHref}?tab=workout`,
      color: "bg-orange-500/15 text-orange-400",
    },
    {
      label: "Öğün Ekle",
      icon: Utensils,
      href: `${todayHref}?tab=meals`,
      color: "bg-emerald-500/15 text-emerald-400",
    },
  ];

  if (!isOnTodayPage) {
    actions.push({
      label: "Bugün",
      icon: CalendarDays,
      href: todayHref,
      color: "bg-primary/15 text-primary",
    });
  }

  return (
    <div
      ref={containerRef}
      className="fixed right-4 z-40 pointer-events-none"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="relative flex flex-col items-end gap-2 pointer-events-auto">
        {/* Expanded actions */}
        <div
          className={`flex flex-col items-end gap-2 transition-all duration-200 ${
            open
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
          aria-hidden={!open}
        >
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 group"
                style={{
                  transitionDelay: open ? `${i * 30}ms` : "0ms",
                }}
                tabIndex={open ? 0 : -1}
              >
                <span className="rounded-md bg-popover text-popover-foreground border border-border shadow-md text-xs font-medium px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                  {a.label}
                </span>
                <span
                  className={`h-11 w-11 rounded-full flex items-center justify-center shadow-md border border-border/60 backdrop-blur ${a.color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* Main toggle button */}
        <button
          type="button"
          onClick={() => {
            hapticTap();
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          aria-label={open ? "Hızlı eylemleri kapat" : "Hızlı eylemler"}
          className="h-13 w-13 rounded-full bg-primary text-primary-foreground shadow-lg border border-primary/30 flex items-center justify-center transition-all active:scale-95 hover:shadow-xl"
        >
          <span
            className={`transition-transform duration-200 ${
              open ? "rotate-45" : "rotate-0"
            }`}
          >
            {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </span>
        </button>
      </div>
    </div>
  );
}
