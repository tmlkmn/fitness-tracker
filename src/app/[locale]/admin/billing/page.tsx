import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getBillingStats } from "@/actions/admin";
import { AdminBillingTools } from "@/components/admin/admin-billing-tools";

export const metadata: Metadata = {
  title: "Abonelik Yönetimi",
  robots: { index: false, follow: false },
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminBillingPage() {
  // getBillingStats() runs getAuthAdmin() — throws for non-admins.
  const stats = await getBillingStats();

  return (
    <div className="px-4 py-6 space-y-5">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Admin
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">Abonelik Yönetimi</h1>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Aktif" value={stats.active} />
        <Stat label="Deneme" value={stats.trialing} />
        <Stat label="Ödeme Bekleyen" value={stats.pastDue} />
        <Stat label="İptal Edilen" value={stats.cancelled} />
        <Stat label="Pro" value={stats.pro} />
        <Stat label="Elite" value={stats.elite} />
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            Tahmini Aylık Gelir (MRR)
          </p>
          <p className="text-3xl font-bold mt-1">
            ${stats.mrrUsd.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Son Ödeme Hataları</h2>
          {stats.recentFailed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentFailed.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {u.paymentFailedAt
                      ? new Date(u.paymentFailedAt).toLocaleDateString("tr-TR")
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AdminBillingTools />
    </div>
  );
}
