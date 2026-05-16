// Client-side onboarding state (guided tour completion + checklist flags).
// Stored in localStorage — see src/lib/dashboard-prefs.ts for the same pattern.
// No DB column is needed: the guided tour is a one-time UX aid, and the
// carousel's `hasSeenOnboarding` column already provides a durable record.

export const TOUR_SURFACES = ["dashboard", "calendar", "day", "progress"] as const;
export type TourSurface = (typeof TOUR_SURFACES)[number];

interface OnboardingState {
  /** Per-surface guided tour completion. */
  tours?: Partial<Record<TourSurface, boolean>>;
  /** User dismissed the getting-started checklist card. */
  checklistDismissed?: boolean;
  /** User has visited the AI assistant at least once. */
  aiVisited?: boolean;
}

const STORAGE_KEY = "fitmusc.onboarding.v1";

/** Dispatched after any write so `useOnboardingStorage` can re-read. */
export const ONBOARDING_EVENT = "fitmusc:onboarding";

export function loadOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return {};
  }
}

function saveOnboardingState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
  } catch {
    // ignore quota/private-mode errors
  }
}

export function isTourDone(surface: TourSurface): boolean {
  return loadOnboardingState().tours?.[surface] === true;
}

export function markTourDone(surface: TourSurface) {
  const state = loadOnboardingState();
  saveOnboardingState({
    ...state,
    tours: { ...state.tours, [surface]: true },
  });
}

export function isChecklistDismissed(): boolean {
  return loadOnboardingState().checklistDismissed === true;
}

export function dismissChecklist() {
  saveOnboardingState({ ...loadOnboardingState(), checklistDismissed: true });
}

export function markAiVisited() {
  const state = loadOnboardingState();
  if (state.aiVisited) return;
  saveOnboardingState({ ...state, aiVisited: true });
}
