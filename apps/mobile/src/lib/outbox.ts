import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager } from "@tanstack/react-query";

import { api, ApiRequestError } from "./api";

// Offline outbox for completion toggles — the app's version of the web's
// IndexedDB outbox (apps/web/src/lib/outbox.ts). Entries are keyed per entity
// (and date for supplements), so toggling the same item again while offline
// only keeps the latest state. The PUTs set a state, so replaying one is safe.
// Kept in AsyncStorage: a queued tick survives the app being closed.

export type Completion =
  | { kind: "meal" | "exercise"; id: number; dayId: number; isCompleted: boolean }
  | { kind: "supplement"; id: number; dayId: number; date: string; isCompleted: boolean };

type Entry = Completion & { seq: number; attempts: number };

export interface DrainResult {
  sent: Completion[];
  rejected: Completion[];
}

const STORAGE_KEY = "fitmusc.outbox.v1";
/** A 5xx is retried on the next drains, then given up. Network failures never count. */
const MAX_ATTEMPTS = 10;

let entries = new Map<string, Entry>();
/** The user the entries belong to; another user signing in discards them. */
let owner: string | null = null;
/** The signed-in user (setOutboxUser); nothing is sent before it is known. */
let sessionUser: string | null = null;
let seqCounter = Date.now();
const listeners = new Set<() => void>();
const drainListeners = new Set<(result: DrainResult) => void>();
/** Outcomes the toggles that queued an entry are waiting for (by seq). */
const waiting = new Map<number, ApiRequestError | null>();

const keyOf = (c: Completion) => (c.kind === "supplement" ? `supplement:${c.id}:${c.date}` : `${c.kind}:${c.id}`);

const loaded: Promise<void> = AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    const stored = raw ? (JSON.parse(raw) as { owner: string | null; entries: Entry[] }) : null;
    if (!stored) return;
    owner = stored.owner;
    entries = new Map(stored.entries.map((e) => [keyOf(e), e]));
    notify();
  })
  .catch(() => {});

let writes = Promise.resolve();
function save() {
  const snapshot = JSON.stringify({ owner, entries: [...entries.values()] });
  // In order, so an older snapshot never lands after a newer one.
  writes = writes.then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot)).catch(() => {});
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const pendingCount = () => entries.size;

/** Called after every drain that sent or dropped something (the app invalidates the affected queries). */
export function onOutboxDrained(listener: (result: DrainResult) => void) {
  drainListeners.add(listener);
  return () => {
    drainListeners.delete(listener);
  };
}

/** Binds the outbox to the signed-in user; entries of another account are dropped. */
export async function setOutboxUser(userId: string) {
  sessionUser = userId;
  await loaded;
  if (owner !== userId) {
    if (owner !== null) entries.clear();
    owner = userId;
    save();
    notify();
  }
  // Ticks queued before the app was closed go out now.
  void drainOutbox();
}

/** Sign-out: nothing queued may be sent with the next account's session. */
export async function clearOutbox() {
  sessionUser = null;
  await loaded;
  entries.clear();
  owner = null;
  save();
  notify();
}

/** The queued state of an item, if a toggle is still waiting to be sent (supplements: on that day). */
function pendingState(kind: Completion["kind"], id: number, dayId: number): boolean | undefined {
  if (kind !== "supplement") return entries.get(`${kind}:${id}`)?.isCompleted;
  for (const entry of entries.values()) {
    if (entry.kind === "supplement" && entry.id === id && entry.dayId === dayId) return entry.isCompleted;
  }
  return undefined;
}

/** Lays the queued toggles over fresh server data, so a refetch never undoes an unsent tick. */
export async function withPending<T extends { id: number; isCompleted: boolean | null }>(
  kind: Completion["kind"],
  list: T[],
  dayId: number,
): Promise<T[]> {
  await loaded;
  if (entries.size === 0) return list;
  return list.map((item) => {
    const state = pendingState(kind, item.id, dayId);
    return state === undefined ? item : { ...item, isCompleted: state };
  });
}

function send(entry: Entry) {
  if (entry.kind === "supplement") {
    return api(`/supplements/${entry.id}/completions/${entry.date}`, { method: "PUT", body: { completed: entry.isCompleted } });
  }
  const path = entry.kind === "meal" ? "meals" : "exercises";
  return api(`/${path}/${entry.id}/completion`, { method: "PUT", body: { isCompleted: entry.isCompleted } });
}

const strip = (e: Entry): Completion =>
  e.kind === "supplement"
    ? { kind: e.kind, id: e.id, dayId: e.dayId, date: e.date, isCompleted: e.isCompleted }
    : { kind: e.kind, id: e.id, dayId: e.dayId, isCompleted: e.isCompleted };

/** Removes a finished entry unless a newer toggle of the same item replaced it meanwhile. */
function settle(entry: Entry, error: ApiRequestError | null) {
  if (waiting.has(entry.seq)) waiting.set(entry.seq, error);
  const key = keyOf(entry);
  if (entries.get(key)?.seq === entry.seq) entries.delete(key);
}

/** Whether a failed send is final: the server refused it (deleted item, past day, …) or kept failing. */
function giveUp(entry: Entry, err: unknown): boolean {
  if (!(err instanceof ApiRequestError)) return false;
  const { status } = err;
  if (status >= 400 && status < 500) return status !== 408 && status !== 429;
  return status >= 500 && ++entry.attempts >= MAX_ATTEMPTS;
}

async function runDrain(): Promise<DrainResult> {
  await loaded;
  const result: DrainResult = { sent: [], rejected: [] };
  if (!onlineManager.isOnline() || entries.size === 0 || !sessionUser || owner !== sessionUser) return result;

  for (const entry of [...entries.values()].sort((a, b) => a.seq - b.seq)) {
    try {
      await send(entry);
      settle(entry, null);
      result.sent.push(strip(entry));
    } catch (err) {
      if (!giveUp(entry, err)) break; // Offline or the server is struggling: keep the rest for later.
      settle(entry, err as ApiRequestError);
      result.rejected.push(strip(entry));
    }
  }

  save();
  notify();
  if (result.sent.length > 0 || result.rejected.length > 0) {
    for (const listener of drainListeners) listener(result);
  }
  return result;
}

let chain: Promise<DrainResult> = Promise.resolve({ sent: [], rejected: [] });

/** Sends what is queued, one drain at a time; each call runs after the one in progress. */
export function drainOutbox(): Promise<DrainResult> {
  chain = chain.then(runDrain, runDrain);
  return chain;
}

/**
 * A completion toggle: queue it, then try to send it. Resolves when it was
 * sent or stays queued (offline — the optimistic state stands); throws the
 * server's error when the server refused it, so the caller rolls back.
 */
export async function syncCompletion(completion: Completion): Promise<void> {
  await loaded;
  const entry: Entry = { ...completion, seq: ++seqCounter, attempts: 0 };
  entries.set(keyOf(entry), entry);
  save();
  notify();

  waiting.set(entry.seq, null);
  try {
    await drainOutbox();
    const error = waiting.get(entry.seq);
    if (error) throw error;
  } finally {
    waiting.delete(entry.seq);
  }
}
