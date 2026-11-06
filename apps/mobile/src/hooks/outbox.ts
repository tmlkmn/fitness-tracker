import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { drainOutbox, onOutboxDrained, pendingCount, subscribeOutbox, type Completion } from "@/lib/outbox";

import { keys } from "./plan";

function listKey(item: Completion) {
  switch (item.kind) {
    case "meal":
      return keys.meals(item.dayId);
    case "exercise":
      return keys.exercises(item.dayId);
    default:
      return keys.supplements(item.dayId);
  }
}

/**
 * Sends queued completion ticks when the connection comes back and when the
 * app returns to the foreground, then refreshes the lists they changed (a
 * tick the server refused disappears that way). The tabs layout mounts it.
 */
export function useOutboxSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const stopDrained = onOutboxDrained(({ sent, rejected }) => {
      for (const item of [...sent, ...rejected]) void qc.invalidateQueries({ queryKey: listKey(item) });
      void qc.invalidateQueries({ queryKey: keys.today });
    });
    const stopOnline = onlineManager.subscribe((online) => {
      if (online) void drainOutbox();
    });
    const appState = AppState.addEventListener("change", (status) => {
      if (status === "active") void drainOutbox();
    });
    void drainOutbox();
    return () => {
      stopDrained();
      stopOnline();
      appState.remove();
    };
  }, [qc]);
}

const subscribeOnline = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();

/** Connection state and the number of ticks waiting to be sent. */
export function useOutboxStatus() {
  return {
    online: useSyncExternalStore(subscribeOnline, isOnline),
    pending: useSyncExternalStore(subscribeOutbox, pendingCount),
  };
}
