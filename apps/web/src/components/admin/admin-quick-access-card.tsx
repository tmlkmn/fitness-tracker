"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Shield, ChevronRight, AlertTriangle, MessageSquare, DollarSign } from "lucide-react";
import { useAdminKpi } from "@/hooks/use-admin-kpi";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Settings entry-point card to the admin panel. Shows a 3-stat mini KPI
 * summary (expiring soon · open feedback · AI cost today) so admins can
 * scan urgency at a glance without leaving settings. Only rendered when
 * the user is an admin.
 */
export function AdminQuickAccessCard() {
  const t = useTranslations("settings.adminQuickAccess");
  const { data: kpi, isLoading, isError } = useAdminKpi(true);

  if (isError) return null;

  return (
    <Link href="/admin">
      <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("title")}</p>
                <p className="text-[10px] text-muted-foreground">{t("subtitle")}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <KpiStat
              icon={<AlertTriangle className="h-3 w-3 text-warning" />}
              label={t("expiring")}
              value={isLoading ? null : (kpi?.expiringWithin7d ?? 0).toString()}
            />
            <KpiStat
              icon={<MessageSquare className="h-3 w-3 text-info" />}
              label={t("feedback")}
              value={isLoading ? null : (kpi?.openFeedback ?? 0).toString()}
            />
            <KpiStat
              icon={<DollarSign className="h-3 w-3 text-success" />}
              label={t("aiCost")}
              value={
                isLoading
                  ? null
                  : `$${(kpi?.aiCostTodayUsd ?? 0).toFixed(2)}`
              }
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function KpiStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-background/60 px-1 py-1.5">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      {value === null ? (
        <Skeleton className="h-4 w-8" />
      ) : (
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      )}
    </div>
  );
}
