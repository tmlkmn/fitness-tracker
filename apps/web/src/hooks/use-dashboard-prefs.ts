"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  loadDashboardPrefs,
  saveDashboardPrefs,
  type DashboardCardKey,
  type DashboardPrefs,
} from "@/lib/dashboard-prefs";

const EMPTY: DashboardPrefs = {};

function subscribe(callback: () => void) {
  window.addEventListener("fitmusc:dashboard-prefs", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("fitmusc:dashboard-prefs", callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedPrefs: DashboardPrefs | null = null;

function getSnapshot(): DashboardPrefs {
  // Re-read from localStorage whenever the subscription fires; cache between reads
  // so getSnapshot returns the same reference until storage changes.
  const next = loadDashboardPrefs();
  if (
    !cachedPrefs ||
    JSON.stringify(cachedPrefs) !== JSON.stringify(next)
  ) {
    cachedPrefs = next;
  }
  return cachedPrefs;
}

function getServerSnapshot(): DashboardPrefs {
  return EMPTY;
}

export function useDashboardPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((key: DashboardCardKey) => {
    const current = loadDashboardPrefs();
    const next: DashboardPrefs = {
      ...current,
      [key]: current[key] === false ? true : false,
    };
    saveDashboardPrefs(next);
  }, []);

  const isVisible = useCallback(
    (key: DashboardCardKey) => prefs[key] !== false,
    [prefs],
  );

  return { prefs, toggle, isVisible, hydrated: true };
}
