import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  DollarSign,
  UserPlus,
  MessageSquare,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import type { AdminKpiSummary } from "@/actions/admin-operations-types";

interface KpiItem {
  label: string;
  value: string;
  href:
    | { pathname: "/admin/kullanicilar"; query?: Record<string, string> }
    | { pathname: "/admin/ai-kullanim" }
    | { pathname: "/admin/geri-bildirim" };
  icon: typeof Users;
  accent: string;
}

function formatUsd(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export async function KpiSummary({ kpi }: { kpi: AdminKpiSummary | null }) {
  const t = await getTranslations("admin.kpi");
  if (!kpi) return null;

  const items: KpiItem[] = [
    {
      label: t("activeUsers"),
      value: String(kpi.activeUsers),
      href: { pathname: "/admin/kullanicilar" },
      icon: Users,
      accent: "text-primary",
    },
    {
      label: t("aiCostToday"),
      value: formatUsd(kpi.aiCostTodayUsd),
      href: { pathname: "/admin/ai-kullanim" },
      icon: DollarSign,
      accent: "text-green-400",
    },
    {
      label: t("expiring"),
      value: String(kpi.expiringWithin7d),
      href: {
        pathname: "/admin/kullanicilar",
        query: { filter: "expiring" },
      },
      icon: CalendarClock,
      accent: "text-amber-400",
    },
    {
      label: t("openFeedback"),
      value: String(kpi.openFeedback),
      href: { pathname: "/admin/geri-bildirim" },
      icon: MessageSquare,
      accent: "text-purple-400",
    },
    {
      label: t("newUsersThisWeek"),
      value: String(kpi.newUsersThisWeek),
      href: { pathname: "/admin/kullanicilar" },
      icon: UserPlus,
      accent: "text-blue-400",
    },
    {
      label: t("aiCostWeek"),
      value: formatUsd(kpi.aiCostWeekUsd),
      href: { pathname: "/admin/ai-kullanim" },
      icon: TrendingUp,
      accent: "text-emerald-400",
    },
  ];

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {t("title")}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="block">
              <Card className="hover:bg-accent/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.label}
                    </p>
                  </div>
                  <p className="text-xl font-bold mt-0.5 tabular-nums">
                    {item.value}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
