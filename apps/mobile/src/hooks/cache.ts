import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Optimistic updates: patch every cached entry under some keys, roll back on error.

export type Snapshot = [QueryKey, unknown][];

/** Applies `update` to every cached entry under `queryKeys`, returning what to roll back to. */
export async function patchCaches<T>(
  qc: QueryClient,
  queryKeys: QueryKey[],
  update: (data: T) => T,
): Promise<Snapshot> {
  const snapshot: Snapshot = [];
  for (const key of queryKeys) {
    await qc.cancelQueries({ queryKey: key });
    for (const [k, data] of qc.getQueriesData<T>({ queryKey: key })) {
      if (data === undefined) continue;
      snapshot.push([k, data]);
      qc.setQueryData(k, update(data));
    }
  }
  return snapshot;
}

export function restore(qc: QueryClient, snapshot: Snapshot | undefined) {
  for (const [k, data] of snapshot ?? []) qc.setQueryData(k, data);
}
