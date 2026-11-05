"use client";

import { useEffect, useState } from "react";
import { countOutbox, subscribeOutbox } from "@/lib/outbox";

export function useOutboxCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      countOutbox().then((n) => {
        if (!cancelled) setCount(n);
      });
    };
    refresh();
    const unsubscribe = subscribeOutbox(refresh);
    // Belt-and-suspenders: poll every 10s for cross-tab changes that
    // missed the BroadcastChannel (e.g. closed tab woke up).
    const interval = window.setInterval(refresh, 10_000);
    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);

  return count;
}
