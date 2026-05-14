import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Users, UserPlus } from "lucide-react";
import { getAtRiskUsers, getAdminKpiSummary } from "@/actions/admin-operations";
import { AtRiskList } from "@/components/admin/at-risk-list";
import { KpiSummary } from "@/components/admin/kpi-summary";
import { AdminQuickNav } from "@/components/admin/admin-quick-nav";

export default async function AdminPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const tOps = await getTranslations("admin.ops");

  let atRisk;
  let kpi;
  try {
    [atRisk, kpi] = await Promise.all([
      getAtRiskUsers(),
      getAdminKpiSummary(),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      redirect(`/${locale}`);
    }
    throw e;
  }

  return (
    <div className="min-h-dvh pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">
                {tOps("title")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {tOps("subtitle")}
              </p>
            </div>
          </div>
          <Link
            href={{ pathname: "/admin/davet" }}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {t("inviteButton")}
          </Link>
        </div>

        <AtRiskList users={atRisk} />

        <KpiSummary kpi={kpi} />

        <AdminQuickNav />

        <div className="text-center pt-2">
          <Link
            href={{ pathname: "/ayarlar" }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {t("backToSettings")}
          </Link>
        </div>
      </div>
    </div>
  );
}
