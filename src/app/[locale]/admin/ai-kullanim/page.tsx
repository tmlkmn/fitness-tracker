"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  getAiUsageByFeature,
  getAiUsageByUser,
  type FeatureUsage,
  type UserAiUsage,
} from "@/actions/admin";
import {
  getAdminAiCostSummary,
  type AiCostSummary,
} from "@/actions/admin-operations";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Bot,
  BarChart3,
  DollarSign,
  Loader2,
} from "lucide-react";
import {
  useTimeAgo,
  useFeatureLabel,
} from "@/components/admin/admin-labels";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

function formatUsd(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(2);
  return v.toFixed(3);
}

export default function AdminAiUsagePage() {
  const router = useRouter();
  const t = useTranslations("admin");
  const tAi = useTranslations("admin.aiUsage");
  const featureLabel = useFeatureLabel();
  const formatTimeAgo = useTimeAgo();

  const [cost, setCost] = useState<AiCostSummary | null>(null);
  const [feature, setFeature] = useState<FeatureUsage[]>([]);
  const [byUser, setByUser] = useState<UserAiUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, f, u] = await Promise.all([
          getAdminAiCostSummary(),
          getAiUsageByFeature(),
          getAiUsageByUser(),
        ]);
        if (cancelled) return;
        setCost(c);
        setFeature(f);
        setByUser(u);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "Forbidden") router.push("/");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-8">
      <AdminBreadcrumb
        segments={[
          { label: t("breadcrumbRoot"), href: "/admin" },
          { label: tAi("title") },
        ]}
      />
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href={{ pathname: "/admin" }}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            aria-label={tAi("title")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {tAi("title")}
          </h1>
        </div>

        {cost && (
          <div className="grid grid-cols-3 gap-2">
            <CostCard
              label={tAi("totalCostToday")}
              cost={cost.todayUsd}
              count={cost.todayCount}
            />
            <CostCard
              label={tAi("totalCostWeek")}
              cost={cost.weekUsd}
              count={cost.weekCount}
            />
            <CostCard
              label={tAi("totalCostMonth")}
              cost={cost.monthUsd}
              count={cost.monthCount}
            />
          </div>
        )}

        {feature.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">
                  {tAi("featureBreakdown")}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 text-muted-foreground font-medium">
                        {t("tableHead.feature")}
                      </th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">
                        {t("tableHead.today")}
                      </th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">
                        {t("tableHead.week")}
                      </th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">
                        {t("tableHead.total")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {feature.map((f) => (
                      <tr key={f.feature} className="border-b border-border/50">
                        <td className="py-1.5">{featureLabel(f.feature)}</td>
                        <td className="text-right py-1.5 tabular-nums">
                          {f.today}
                        </td>
                        <td className="text-right py-1.5 tabular-nums">
                          {f.thisWeek}
                        </td>
                        <td className="text-right py-1.5 tabular-nums font-medium">
                          {f.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {byUser.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">
                  {tAi("userBreakdown")}
                </h2>
              </div>
              <div className="space-y-2.5">
                {byUser.map((u) => (
                  <Link
                    key={u.userId}
                    href={{
                      pathname: "/admin/kullanicilar/[userId]",
                      params: { userId: u.userId },
                    }}
                    className="block border-b border-border/50 pb-2 last:border-0 hover:bg-accent/30 rounded -mx-2 px-2 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {u.userName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatTimeAgo(u.lastUsed)}
                        </p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">
                        {u.total}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(u.features).map(([feat, count]) => (
                        <span
                          key={feat}
                          className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px]"
                        >
                          {featureLabel(feat)}
                          <span className="font-bold">{count}</span>
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CostCard({
  label,
  cost,
  count,
}: Readonly<{
  label: string;
  cost: number;
  count: number;
}>) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3 w-3 text-green-400" />
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        </div>
        <p className="text-lg font-bold tabular-nums mt-0.5">
          ${formatUsd(cost)}
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {count} call
        </p>
      </CardContent>
    </Card>
  );
}
