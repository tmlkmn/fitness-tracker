import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-utils";
import { collectUserExport } from "@/lib/account-export";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    const user = await getAuthSession();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await collectUserExport(userId);
  const filename = `fitmusc-verilerim-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
