// IndexedDB-backed React Query persister.
// Opt-in per query via `meta: { persist: true }` — only critical reads
// (meals.byDay, exercises, supplements.byDay, supplement-completions) are
// persisted so AI suggestions / rate-limit queries don't bloat storage.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AsyncStorage } from "@tanstack/react-query-persist-client";
import { experimental_createQueryPersister } from "@tanstack/react-query-persist-client";

const DB_NAME = "fitmusc-query-cache";
const DB_VERSION = 1;
const STORE = "queries";

interface QueryCacheSchema extends DBSchema {
  [STORE]: {
    key: string;
    value: string;
  };
}

let dbPromise: Promise<IDBPDatabase<QueryCacheSchema>> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = openDB<QueryCacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

const idbStorage: AsyncStorage<string> = {
  async getItem(key) {
    try {
      const db = await getDB();
      return (await db.get(STORE, key)) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      const db = await getDB();
      await db.put(STORE, value, key);
    } catch {
      // Quota or unavailable — silently drop; in-memory cache still works
    }
  },
  async removeItem(key) {
    try {
      const db = await getDB();
      await db.delete(STORE, key);
    } catch {
      // ignore
    }
  },
};

export const queryPersister = experimental_createQueryPersister<string>({
  storage: idbStorage,
  maxAge: 24 * 60 * 60 * 1000,
  prefix: "fitmusc-rq",
  filters: {
    // Only persist queries that explicitly opted in via meta.persist === true.
    predicate: (q) => (q.meta as { persist?: boolean } | undefined)?.persist === true,
  },
});

export async function clearQueryCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE);
  } catch {
    // ignore
  }
}
