import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthSession } from "@/lib/auth-utils";
import { getUserLocale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import {
  ReceiptDocument,
  type ReceiptData,
} from "@/lib/billing/receipt-document";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let sessionUser;
  try {
    sessionUser = await getAuthSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId) || invoiceId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      provider: invoices.provider,
      amount: invoices.amount,
      subtotal: invoices.subtotal,
      tax: invoices.tax,
      currency: invoices.currency,
      issuedAt: invoices.issuedAt,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.userId, users.id))
    .where(eq(invoices.id, invoiceId));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Owner or admin only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = (sessionUser as any).role === "admin";
  if (row.userId !== sessionUser.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const locale = getUserLocale(sessionUser);
  const t = await getTranslations({ locale, namespace: "receipt" });

  // Legacy rows predate the tax split — fall back to subtotal = total.
  const data: ReceiptData = {
    receiptNo: `FM-${String(row.id).padStart(6, "0")}`,
    issuedAt: formatDate(row.issuedAt, locale),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    providerLabel: row.provider === "iyzico" ? "iyzico" : "Lemon Squeezy",
    itemName: t("subscriptionItem"),
    amount: row.amount,
    subtotal: row.subtotal ?? row.amount,
    tax: row.tax ?? "0.00",
    currency: row.currency.toUpperCase(),
    company: {
      name: process.env.COMPANY_LEGAL_NAME ?? "FitMusc",
      address: process.env.COMPANY_ADDRESS ?? "",
      taxId: process.env.COMPANY_TAX_ID ?? "",
    },
    labels: {
      title: t("title"),
      receiptNo: t("receiptNo"),
      date: t("date"),
      billedTo: t("billedTo"),
      item: t("item"),
      taxNo: t("taxNo"),
      subtotal: t("subtotal"),
      tax: t("tax"),
      total: t("total"),
      paidVia: t("paidVia"),
      footer: t("footer"),
    },
  };

  // ReceiptDocument is a pure builder — calling it yields the <Document>
  // element renderToBuffer expects.
  const buffer = await renderToBuffer(ReceiptDocument({ data }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.receiptNo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
