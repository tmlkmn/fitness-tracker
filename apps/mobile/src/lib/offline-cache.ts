import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";

import { CACHE_MAX_AGE, queryClient } from "./query-client";

// The last data the user saw stays on the device, one copy per account, so
// the app opens offline with today's plan and the outbox has something to
// tick. Restoring never overwrites fresher data, and stale entries refetch
// as soon as the app is online.

const THROTTLE_MS = 1000;
const keyFor = (userId: string) => `fitmusc.queryCache.${userId}`;

/** Not kept: AI answers, jobs and chat (large, and short-lived) and this session's push registration. */
const skip = (root: string) => root.startsWith("ai.") || root === "push.registration";

/** Restores the user's saved cache and keeps saving it; returns the stop function. */
export function persistCacheFor(userId: string): () => void {
  const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: keyFor(userId), throttleTime: THROTTLE_MS });
  const [unsubscribe] = persistQueryClient({
    queryClient,
    persister,
    maxAge: CACHE_MAX_AGE,
    // A new app version may change what the screens expect; start fresh then.
    buster: `1:${Constants.expoConfig?.version ?? ""}`,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === "success" && !skip(String(query.queryKey[0])),
      shouldDehydrateMutation: () => false,
    },
  });
  return unsubscribe;
}

/** Sign-out: delete the account's saved copy — again after the throttle, in case a save was already on its way. */
export function forgetCache(userId: string) {
  const remove = () => AsyncStorage.removeItem(keyFor(userId)).catch(() => {});
  void remove();
  setTimeout(remove, THROTTLE_MS * 3);
}
