import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  DollarSign,
  MessageSquare,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import type { AdminKpiSummary } from "@/actions/admin-operations-types";

type AttentionLevel = "info" | "warn" | "alert";

interface KpiPairedCardProps {
  label: string;
  value: string;
  subtitleLabel: string;
  subtitleValue: string;
  icon: LucideIcon;
  href:
    | { pathname: "/admin/kullanicilar"; query?: Record<string, string> }
    | { pathname: "/admin/ai-kullanim" }
    | { pathname: "/admin/geri-bildirim" };
}

interface KpiAlertCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href:
    | { pathname: "/admin/kullanicilar"; query?: Record<string, string> }
    | { pathname: "/admin/geri-bildirim" };
  level: AttentionLevel;
  zeroHint?: string;
}

function formatUsd(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function attentionClasses(level: AttentionLevel, isZero: boolean): {
  card: string;
  icon: string;
  value: string;
} {
  if (isZero) {
    return {
      card: "hover:bg-accent/30",
      icon: "text-muted-foreground",
      value: "text-muted-foreground",
    };
  }
  if (level === "alert") {
    return {
      card: "border-destructive/40 bg-destructive/5 hover:bg-destructive/10",
      icon: "text-destructive",
      value: "text-destructive",
    };
  }
  return {
    card: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10",
    icon: "text-amber-500",
    value: "text-amber-500",
  };
}

function KpiPairedCard({
  label,
  value,
  subtitleLabel,
  subtitleValue,
  icon: Icon,
  href,
}: KpiPairedCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="hover:bg-accent/30 transition-colors h-full">
        <CardContent className="p-3 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          </div>
          <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {subtitleLabel}: <span className="text-foreground/80">{subtitleValue}</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function KpiAlertCard({
  label,
  value,
  icon: Icon,
  href,
  level,
  zeroHint,
}: KpiAlertCardProps) {
  const isZero = value === 0;
  const cls = attentionClasses(level, isZero);
  return (
    <Link href={href} className="block">
      <Card className={`transition-colors h-full ${cls.card}`}>
        <CardContent className="p-3 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${cls.icon}`} />
            <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          </div>
          <p className={`text-xl font-bold tabular-nums leading-tight ${cls.value}`}>
            {value}
          </p>
          {isZero && zeroHint && (
            <p className="text-[10px] text-muted-foreground">{zeroHint}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export async function KpiSummary({ kpi }: { kpi: AdminKpiSummary | null }) {
  const t = await getTranslations("admin.kpi");
  if (!kpi) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {t("title")}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <KpiPairedCard
          label={t("activeUsers")}
          value={String(kpi.activeUsers)}
          subtitleLabel={t("newUsersThisWeekShort")}
          subtitleValue={`+${kpi.newUsersThisWeek}`}
          icon={Users}
          href={{ pathname: "/admin/kullanicilar" }}
        />
        <KpiPairedCard
          label={t("aiCostToday")}
          value={`$${formatUsd(kpi.aiCostTodayUsd)}`}
          subtitleLabel={t("weekLabel")}
          subtitleValue={`$${formatUsd(kpi.aiCostWeekUsd)}`}
          icon={DollarSign}
          href={{ pathname: "/admin/ai-kullanim" }}
        />
        <KpiAlertCard
          label={t("expiring")}
          value={kpi.expiringWithin7d}
          icon={CalendarClock}
          href={{ pathname: "/admin/kullanicilar", query: { filter: "expiring" } }}
          level="warn"
          zeroHint={t("expiringZeroHint")}
        />
        <KpiAlertCard
          label={t("openFeedback")}
          value={kpi.openFeedback}
          icon={MessageSquare}
          href={{ pathname: "/admin/geri-bildirim" }}
          level={kpi.openFeedback >= 3 ? "alert" : "warn"}
          zeroHint={t("feedbackZeroHint")}
        />
      </div>
    </section>
  );
}
