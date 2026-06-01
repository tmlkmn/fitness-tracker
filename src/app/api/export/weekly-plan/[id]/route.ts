import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireApiUser } from "@/lib/api-auth";
import { verifyWeeklyPlanReadAccess } from "@/lib/ownership";
import { collectWeeklyPlan } from "@/lib/export/collect-weekly-plan";
import { getUserLocale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";
import { resolveTargets } from "@/lib/macro-targets";
import { buildExportLabels, slugForFilename } from "@/lib/pdf/labels";
import {
  WeeklyPlanDocument,
  type WeeklyPlanDocData,
} from "@/lib/pdf/documents/weekly-plan-document";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const { id } = await params;
  const weeklyPlanId = Number(id);
  if (!Number.isInteger(weeklyPlanId) || weeklyPlanId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await verifyWeeklyPlanReadAccess(weeklyPlanId, user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const collected = await collectWeeklyPlan(weeklyPlanId);
  if (!collected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const locale = getUserLocale(user);
  const labels = await buildExportLabels(locale);

  // Date range from startDate (+6 days).
  let dateRange: string | null = null;
  if (collected.plan.startDate) {
    const start = parseDateOnly(collected.plan.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    dateRange = `${formatDate(start, locale, { day: "numeric", month: "short" })} – ${formatDate(end, locale, { day: "numeric", month: "short", year: "numeric" })}`;
  }

  // Macro targets only meaningful for the plan owner (viewer == owner).
  let targets: WeeklyPlanDocData["targets"] = null;
  if (collected.plan.userId === user.id) {
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, collected.plan.userId));
    if (owner) {
      targets = await resolveTargets(owner, owner.id);
    }
  }

  const generatedAt = formatDate(new Date(), locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const data: WeeklyPlanDocData = {
    collected,
    locale,
    labels,
    dateRange,
    generatedAt,
    targets,
  };

  // The flowing layout is the clean default, but react-pdf's layout engine
  // crashes on extremely long (>~10 page) flowing documents. If that happens,
  // retry with atomic days (each day pinned to a page) so the export still
  // produces a PDF instead of a 500.
  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(WeeklyPlanDocument({ data }));
  } catch {
    buffer = await renderToBuffer(
      WeeklyPlanDocument({ data: { ...data, atomicDays: true } }),
    );
  }
  const filename = `fitmusc-${slugForFilename(collected.plan.title)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
