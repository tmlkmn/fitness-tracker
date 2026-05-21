import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redactId } from "@/lib/log-redact";

/**
 * Client-side push diagnostics sink.
 *
 * Push subscription runs entirely in the browser, so `pushManager.subscribe()`
 * failures (and the iOS "service worker never activated" timeout) only ever
 * surface in the *device* console — they never reach Vercel. This endpoint
 * lets `subscribeToPush()` POST a structured snapshot of every outcome so the
 * failure is greppable in Vercel logs as `[push-diag]`.
 *
 * Write-only: it logs and discards. No data is read back or persisted.
 */

/** Caps any single string field so a hostile/buggy client can't spam logs. */
const MAX_FIELD = 600;

function clip(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > MAX_FIELD ? `${s.slice(0, MAX_FIELD)}…` : s;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ? redactId(session.user.id) : "anon";

  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed body — still log whatever metadata we have rather than 400.
  }

  const report = {
    userId,
    stage: clip(body.stage),
    reason: clip(body.reason),
    errorName: clip(body.errorName),
    errorMessage: clip(body.errorMessage),
    permission: clip(body.permission),
    standalone: body.standalone === true,
    swController: body.swController === true,
    swScriptUrl: clip(body.swScriptUrl),
    swInstalling: clip(body.swInstalling),
    swWaiting: clip(body.swWaiting),
    swActive: clip(body.swActive),
    activationWaitMs:
      typeof body.activationWaitMs === "number" ? body.activationWaitMs : null,
    vapidKeyLen: typeof body.vapidKeyLen === "number" ? body.vapidKeyLen : null,
    ua: clip(body.ua),
  };

  const line = `[push-diag] ${JSON.stringify(report)}`;
  if (report.reason) {
    console.error(line);
  } else {
    console.log(line);
  }

  return NextResponse.json({ ok: true });
}
