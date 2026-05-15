"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, Download } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import { useInvoices } from "@/hooks/use-billing";

export function InvoiceHistory() {
  const t = useTranslations("billing");
  const locale = useLocale() as Locale;
  const { data: invoices, isLoading } = useInvoices();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("invoices")}</span>
        </div>

        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noInvoices")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">
                    {inv.amount} {inv.currency.toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(inv.issuedAt, locale)}
                  </p>
                </div>
                {inv.pdfUrl && (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {t("invoiceDownload")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
