// IndexedDB outbox for offline-first toggle mutations.
// Single object store keyed by `${kind}:${entityId}[:${date}]` for coalescing —
// repeated toggles on the same entity collapse to the latest desired state.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  OutboxKind,
  OutboxPayloadByKind,
  MealTogglePayload,
  ExerciseTogglePayload,
  SupplementTogglePayload,
} from "./sync-payloads";

const DB_NAME = "fitmusc-outbox";
const DB_VERSION = 1;
const STORE = "entries";
const CHANNEL = "fitmusc-outbox-changes";

export type OutboxEntry =
  | {
      key: string;
      kind: "meal";
      payload: MealTogglePayload;
      createdAt: number;
      attempts: number;
    }
  | {
      key: string;
      kind: "exercise";
      payload: ExerciseTogglePayload;
      createdAt: number;
      attempts: number;
    }
  | {
      key: string;
      kind: "supplement";
      payload: SupplementTogglePayload;
      createdAt: number;
      attempts: number;
    };

interface OutboxSchema extends DBSchema {
  [STORE]: {
    key: string;
    value: OutboxEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<OutboxSchema>> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = openDB<OutboxSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL);
}

function notifyChange() {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: "change" });
    ch.close();
  }
}

export function outboxKey<K extends OutboxKind>(
  kind: K,
  payload: OutboxPayloadByKind[K],
): string {
  if (kind === "supplement") {
    const p = payload as SupplementTogglePayload;
    return `supplement:${p.supplementId}:${p.date}`;
  }
  const p = payload as MealTogglePayload | ExerciseTogglePayload;
  return `${kind}:${p.id}`;
}

export async function enqueueOutbox<K extends OutboxKind>(
  kind: K,
  payload: OutboxPayloadByKind[K],
): Promise<void> {
  const db = await getDB();
  const key = outboxKey(kind, payload);
  const existing = await db.get(STORE, key);
  const entry = {
    key,
    kind,
    payload,
    createdAt: existing?.createdAt ?? Date.now(),
    attempts: 0,
  } as OutboxEntry;
  await db.put(STORE, entry);
  notifyChange();
}

export async function dequeueOutbox(key: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, key);
  notifyChange();
}

export async function bumpAttempts(key: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get(STORE, key);
  if (!entry) return;
  entry.attempts += 1;
  await db.put(STORE, entry);
}

export async function peekOutbox(): Promise<OutboxEntry[]> {
  const db = await getDB();
  const all = await db.getAll(STORE);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function countOutbox(): Promise<number> {
  try {
    const db = await getDB();
    return await db.count(STORE);
  } catch {
    return 0;
  }
}

export async function clearOutbox(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE);
    notifyChange();
  } catch {
    // IDB unavailable — nothing to clear
  }
}

export function subscribeOutbox(listener: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const ch = new BroadcastChannel(CHANNEL);
  ch.onmessage = () => listener();
  return () => ch.close();
}
