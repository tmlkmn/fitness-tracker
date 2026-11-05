import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { progressLogs } from "@/db/schema";
import { requireApiUser } from "@/lib/api-auth";
import { getUserLocale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import { buildExportLabels } from "@/lib/pdf/labels";
import {
  ProgressReportDocument,
  type ProgressDocData,
} from "@/lib/pdf/documents/progress-report-document";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (response) return response;

  // Chronological ascending — the chart and trend table both want oldest→newest.
  const logs = await db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.userId, user.id))
    .orderBy(asc(progressLogs.logDate));

  const locale = getUserLocale(user);
  const labels = await buildExportLabels(locale);
  const generatedAt = formatDate(new Date(), locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const data: ProgressDocData = { logs, locale, labels, generatedAt };

  const buffer = await renderToBuffer(ProgressReportDocument({ data }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fitmusc-progress.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
