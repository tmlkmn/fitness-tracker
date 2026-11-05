import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { shoppingLists, weeklyPlans } from "@/db/schema";
import { requireApiUser } from "@/lib/api-auth";
import { verifyWeeklyPlanReadAccess } from "@/lib/ownership";
import { getUserLocale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";
import { buildExportLabels, slugForFilename } from "@/lib/pdf/labels";
import {
  ShoppingListDocument,
  type ShoppingListDocData,
  type ShoppingItemData,
} from "@/lib/pdf/documents/shopping-list-document";

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

  const [plan] = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.id, weeklyPlanId));
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.weeklyPlanId, weeklyPlanId))
    .orderBy(asc(shoppingLists.sortOrder));

  const locale = getUserLocale(user);
  const labels = await buildExportLabels(locale);

  const items: ShoppingItemData[] = rows.map((r) => ({
    id: r.id,
    category: r.category,
    itemName: r.itemName,
    quantity: r.quantity,
    notes: r.notes,
    isPurchased: r.isPurchased,
  }));

  const purchased = items.filter((i) => i.isPurchased).length;

  let weekLabel = plan.title;
  if (plan.startDate) {
    const start = parseDateOnly(plan.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    weekLabel = `${formatDate(start, locale, { day: "numeric", month: "short" })} – ${formatDate(end, locale, { day: "numeric", month: "short" })}`;
  }

  const generatedAt = formatDate(new Date(), locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const data: ShoppingListDocData = {
    items,
    weekLabel,
    labels,
    generatedAt,
    progressLine: `${purchased}/${items.length}`,
  };

  const buffer = await renderToBuffer(ShoppingListDocument({ data }));
  const filename = `fitmusc-${slugForFilename(labels.shoppingTitle)}-${weeklyPlanId}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
