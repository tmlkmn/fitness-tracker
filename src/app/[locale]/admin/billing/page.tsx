import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getBillingStats,
  getRecentInvoices,
  getRecentWebhookEvents,
} from "@/actions/admin";
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
  // Each of these runs getAuthAdmin() — throws for non-admins.
  const [stats, invoiceLog, webhookLog] = await Promise.all([
    getBillingStats(),
    getRecentInvoices(),
    getRecentWebhookEvents(),
  ]);

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

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Fatura Geçmişi</h2>
          {invoiceLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoiceLog.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{inv.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.provider} ·{" "}
                      {new Date(inv.issuedAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {inv.amount} {inv.currency}
                    </p>
                    {inv.pdfUrl ? (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-400 hover:underline"
                      >
                        Fatura PDF
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {inv.status}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Webhook Kayıtları</h2>
          {webhookLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          ) : (
            <ul className="divide-y divide-border">
              {webhookLog.map((ev) => (
                <li key={ev.id} className="py-2 text-sm">
                  <details>
                    <summary className="flex cursor-pointer items-center justify-between gap-2">
                      <span className="font-medium">
                        {ev.eventName ?? "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ev.provider} ·{" "}
                        {new Date(ev.processedAt).toLocaleString("tr-TR")}
                      </span>
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
