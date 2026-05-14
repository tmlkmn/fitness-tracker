import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserAdminDetail } from "@/actions/admin-user-detail";
import { UserDetailView } from "@/components/admin/user-detail-view";

export default async function AdminUserDetailPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string; userId: string }>;
}>) {
  const { locale, userId } = await params;
  const t = await getTranslations("admin.userDetail");

  let detail;
  try {
    detail = await getUserAdminDetail(userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      redirect(`/${locale}`);
    }
    if (msg === "User not found") {
      return (
        <div className="min-h-dvh pb-8">
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
            <Link
              href={{ pathname: "/admin/kullanicilar" }}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToList")}
            </Link>
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("notFound")}
            </p>
          </div>
        </div>
      );
    }
    throw e;
  }

  return <UserDetailView detail={detail} />;
}
