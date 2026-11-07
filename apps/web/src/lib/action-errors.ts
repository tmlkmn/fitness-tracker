/**
 * Error codes the browser may see from a server action.
 *
 * In production React sends a server action's error to the browser with its
 * message stripped (only a digest survives), so `err.message === "X"` checks
 * in client code never match. `runSafeAction` (src/actions/safe-action.ts)
 * returns the code below instead, and `callAction` (src/lib/safe-action.ts)
 * rethrows it in the browser.
 *
 * A code is a short identifier, optionally with a number (`EmailMismatch`,
 * `RATE_LIMITED:30`, `COOLDOWN:12`) — the shape our actions use for expected
 * failures. Sentences (driver, network or query errors) never match, so they
 * stay hidden. better-auth errors carry their code on `body.code`.
 */
const CODE = /^[A-Za-z][A-Za-z0-9_]{1,63}(?::\d{1,7})?$/;

export function expectedErrorCode(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  if (CODE.test(err.message)) return err.message;
  const bodyCode = (err as { body?: { code?: unknown } }).body?.code;
  if (typeof bodyCode === "string" && CODE.test(bodyCode)) return bodyCode;
  return null;
}
