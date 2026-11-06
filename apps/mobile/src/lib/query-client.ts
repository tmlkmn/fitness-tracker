import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState, Platform } from "react-native";

import { ApiRequestError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Same as the web hooks.
      staleTime: 60_000,
      // 4xx answers won't change on a retry; network errors and 5xx might.
      retry: (failureCount, error) =>
        !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
    mutations: { retry: false },
  },
});

// React Native has no window focus / online events — wire the app state and
// the network state in, so queries refetch on resume and pause offline.
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => setOnline(state.isConnected !== false));
  return () => subscription.remove();
});

AppState.addEventListener("change", (status) => {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active");
});
