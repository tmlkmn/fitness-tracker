import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { collectUserExport } from "@/lib/account-export";

export const runtime = "nodejs";

export async function GET() {
  // KVKK / data portability: any logged-in user must be able to export, even
  // if approval was revoked or billing lapsed.
  const { user, response } = await requireApiUser({
    requireApproved: false,
    requireActiveBilling: false,
  });
  if (response) return response;

  const data = await collectUserExport(user.id);
  const filename = `fitmusc-verilerim-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
