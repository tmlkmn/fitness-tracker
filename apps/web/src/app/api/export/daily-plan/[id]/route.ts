import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireApiUser } from "@/lib/api-auth";
import { verifyDailyPlanReadAccess } from "@/lib/ownership";
import { collectDailyPlan } from "@/lib/export/collect-weekly-plan";
import { getUserLocale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";
import { buildExportLabels, slugForFilename } from "@/lib/pdf/labels";
import {
  DailyPlanDocument,
  type DailyPlanDocData,
} from "@/lib/pdf/documents/daily-plan-document";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const { id } = await params;
  const dailyPlanId = Number(id);
  if (!Number.isInteger(dailyPlanId) || dailyPlanId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await verifyDailyPlanReadAccess(dailyPlanId, user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const day = await collectDailyPlan(dailyPlanId);
  if (!day) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const locale = getUserLocale(user);
  const labels = await buildExportLabels(locale);

  const dateLabel = day.date
    ? formatDate(parseDateOnly(day.date), locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
      })
    : null;

  const generatedAt = formatDate(new Date(), locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const data: DailyPlanDocData = { day, locale, labels, dateLabel, generatedAt };

  const buffer = await renderToBuffer(DailyPlanDocument({ data }));
  const filename = `fitmusc-${slugForFilename(day.dayName)}-${day.date ?? day.id}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
