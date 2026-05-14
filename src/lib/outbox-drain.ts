// Drains the IndexedDB outbox by replaying queued toggles to /api/sync/* endpoints.
// State-based idempotency: server SQL is safe to replay; coalescing happens at enqueue time.

import type { QueryClient } from "@tanstack/react-query";
import {
  bumpAttempts,
  countOutbox,
  dequeueOutbox,
  peekOutbox,
  subscribeOutbox,
  type OutboxEntry,
} from "./outbox";
import { SYNC_ENDPOINTS } from "./sync-payloads";

type DrainResult = {
  succeeded: number;
  rejected: number;
  remaining: number;
};

let inFlight: Promise<DrainResult> | null = null;

function isClientErr(status: number) {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

async function postOne(entry: OutboxEntry): Promise<"ok" | "retry" | "drop"> {
  const endpoint = SYNC_ENDPOINTS[entry.kind];
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry.payload),
    });
    if (res.ok) return "ok";
    if (isClientErr(res.status)) {
      console.warn(
        `[outbox] server rejected ${entry.key} (${res.status}) — dropping`,
      );
      return "drop";
    }
    return "retry";
  } catch {
    // Network error — keep in queue
    return "retry";
  }
}

function invalidateAfterDrain(qc: QueryClient, kinds: Set<string>) {
  if (kinds.has("meal")) {
    qc.invalidateQueries({ queryKey: ["meals.byDay"] });
    qc.invalidateQueries({ queryKey: ["today-dashboard"] });
  }
  if (kinds.has("exercise")) {
    qc.invalidateQueries({ queryKey: ["exercises"] });
    qc.invalidateQueries({ queryKey: ["today-dashboard"] });
  }
  if (kinds.has("supplement")) {
    qc.invalidateQueries({ queryKey: ["supplement-completions"] });
    qc.invalidateQueries({ queryKey: ["supplements.byDay"] });
  }
}

export function drainOutbox(qc?: QueryClient): Promise<DrainResult> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const drainedKinds = new Set<string>();
    let succeeded = 0;
    let rejected = 0;
    try {
      // Cheap online gate — if navigator says offline, skip the work
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return { succeeded: 0, rejected: 0, remaining: await countOutbox() };
      }
      const entries = await peekOutbox();
      for (const entry of entries) {
        const result = await postOne(entry);
        if (result === "ok") {
          await dequeueOutbox(entry.key);
          drainedKinds.add(entry.kind);
          succeeded += 1;
        } else if (result === "drop") {
          await dequeueOutbox(entry.key);
          drainedKinds.add(entry.kind);
          rejected += 1;
        } else {
          await bumpAttempts(entry.key);
          // Stop on first network failure — likely all subsequent will fail too
          break;
        }
      }
      if (qc && drainedKinds.size > 0) invalidateAfterDrain(qc, drainedKinds);
      const remaining = await countOutbox();
      return { succeeded, rejected, remaining };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function startOutboxListeners(qc: QueryClient): () => void {
  const trigger = () => {
    void drainOutbox(qc);
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") trigger();
  };
  const onSWMessage = (event: MessageEvent) => {
    if (event.data?.type === "outbox-replay-success") trigger();
  };

  window.addEventListener("online", trigger);
  document.addEventListener("visibilitychange", onVisibility);
  navigator.serviceWorker?.addEventListener("message", onSWMessage);

  // Drain on mount in case the page reloaded with pending entries
  trigger();

  return () => {
    window.removeEventListener("online", trigger);
    document.removeEventListener("visibilitychange", onVisibility);
    navigator.serviceWorker?.removeEventListener("message", onSWMessage);
  };
}

// React hook helper for components that need the current pending count
// (consumed by NetworkStatus banner).
export function getOutboxSubscriber() {
  return {
    subscribe: subscribeOutbox,
    getSnapshot: countOutbox,
  };
}
