"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  loadOnboardingState,
  dismissChecklist as dismissChecklistFn,
  markAiVisited as markAiVisitedFn,
  ONBOARDING_EVENT,
} from "@/lib/onboarding-storage";

interface OnboardingFlags {
  checklistDismissed: boolean;
  aiVisited: boolean;
}

const SERVER_SNAPSHOT: OnboardingFlags = {
  checklistDismissed: false,
  aiVisited: false,
};

function subscribe(callback: () => void) {
  window.addEventListener(ONBOARDING_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

let cached: OnboardingFlags | null = null;

function getSnapshot(): OnboardingFlags {
  const state = loadOnboardingState();
  const next: OnboardingFlags = {
    checklistDismissed: state.checklistDismissed === true,
    aiVisited: state.aiVisited === true,
  };
  // Keep a stable reference until the underlying values change.
  if (
    !cached ||
    cached.checklistDismissed !== next.checklistDismissed ||
    cached.aiVisited !== next.aiVisited
  ) {
    cached = next;
  }
  return cached;
}

/**
 * Reactive view of the localStorage onboarding flags consumed by the
 * getting-started checklist (`useSyncExternalStore`, same pattern as
 * `useDashboardPrefs`).
 */
export function useOnboardingStorage() {
  const flags = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const dismissChecklist = useCallback(() => dismissChecklistFn(), []);
  const markAiVisited = useCallback(() => markAiVisitedFn(), []);

  return { ...flags, dismissChecklist, markAiVisited };
}
