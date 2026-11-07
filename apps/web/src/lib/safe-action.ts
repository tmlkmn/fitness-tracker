import { runSafeAction, type SafeActions } from "@/actions/safe-action";

/** An expected server action failure; `message` (and `code`) is the code the action threw. */
export class ActionError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ActionError";
  }
}

/**
 * Calls a server action from the browser so that an expected failure arrives
 * as its code — `err.message === "RATE_LIMITED"` then works in production
 * too, where React strips the message of a thrown server action error.
 * Unexpected errors stay generic. Register the action in SAFE_ACTIONS
 * (src/actions/safe-action.ts) first.
 */
export async function callAction<K extends keyof SafeActions>(
  name: K,
  ...args: Parameters<SafeActions[K]>
): Promise<Awaited<ReturnType<SafeActions[K]>>> {
  const result = await runSafeAction(name, args);
  if (!result.ok) throw new ActionError(result.error);
  return result.data as Awaited<ReturnType<SafeActions[K]>>;
}
