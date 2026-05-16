// Guided tour step definitions per surface. Each step anchors to a stable
// `data-tour="..."` attribute placed on a real UI element. driver.js handles
// the spotlight overlay, positioning, keyboard nav and scrolling.

import type { Config, DriveStep, Side } from "driver.js";
import type { TourSurface } from "./onboarding-storage";

interface StepDef {
  /** CSS selector for the anchor element. */
  element: string;
  /** i18n key suffix under `onboarding.tour.steps.{surface}`. */
  key: string;
  /** Preferred popover placement relative to the anchor. */
  side: Side;
}

const TOUR_STEPS: Record<TourSurface, StepDef[]> = {
  dashboard: [
    { element: '[data-tour="greeting"]', key: "greeting", side: "bottom" },
    { element: '[data-tour="today-plan"]', key: "todayPlan", side: "bottom" },
    { element: '[data-tour="this-week"]', key: "thisWeek", side: "bottom" },
    { element: '[data-tour="daily-rings"]', key: "rings", side: "top" },
    { element: '[data-tour="water-sleep"]', key: "waterSleep", side: "top" },
    { element: '[data-tour="dashboard-stats"]', key: "stats", side: "top" },
    { element: '[data-tour="quick-access"]', key: "quickAccess", side: "top" },
    { element: '[data-tour="bottom-nav"]', key: "nav", side: "top" },
    { element: '[data-tour="getting-started"]', key: "checklist", side: "bottom" },
  ],
  calendar: [
    { element: '[data-tour="week-strip"]', key: "weekStrip", side: "bottom" },
    { element: '[data-tour="full-calendar"]', key: "fullCalendar", side: "bottom" },
    { element: '[data-tour="ai-weekly"]', key: "aiWeekly", side: "bottom" },
    { element: '[data-tour="shopping-cart"]', key: "shopping", side: "bottom" },
    { element: '[data-tour="share"]', key: "share", side: "bottom" },
    { element: '[data-tour="day-detail"]', key: "dayDetail", side: "top" },
  ],
  day: [
    { element: '[data-tour="tab-meals"]', key: "tabMeals", side: "bottom" },
    { element: '[data-tour="tab-workout"]', key: "tabWorkout", side: "bottom" },
    { element: '[data-tour="tab-supplements"]', key: "tabSupplements", side: "bottom" },
    { element: '[data-tour="tab-wellness"]', key: "tabWellness", side: "bottom" },
    { element: '[data-tour="day-macro"]', key: "macros", side: "bottom" },
    { element: '[data-tour="meal-card"]', key: "swipe", side: "top" },
    { element: '[data-tour="day-add"]', key: "addItems", side: "top" },
  ],
  progress: [
    { element: '[data-tour="progress-chart"]', key: "chart", side: "bottom" },
    { element: '[data-tour="add-measurement"]', key: "add", side: "top" },
  ],
  settings: [
    { element: '[data-tour="settings-profile"]', key: "profile", side: "bottom" },
    { element: '[data-tour="settings-health"]', key: "health", side: "bottom" },
    { element: '[data-tour="settings-goals"]', key: "goals", side: "bottom" },
    { element: '[data-tour="settings-app"]', key: "app", side: "top" },
    { element: '[data-tour="settings-data"]', key: "data", side: "top" },
  ],
};

/** How many of a surface's anchor elements are currently in the DOM. */
export function countTourAnchors(surface: TourSurface): number {
  if (typeof document === "undefined") return 0;
  return TOUR_STEPS[surface].filter((s) => document.querySelector(s.element))
    .length;
}

/**
 * Build a driver.js config for a surface. Steps whose anchor element is not
 * currently in the DOM are dropped — so a conditionally-rendered target (e.g.
 * the calendar's share/cart icons, which only exist once a plan is created)
 * never leaves an orphan popover.
 */
export function buildDriverConfig(
  surface: TourSurface,
  t: (key: string) => string,
  onDone: () => void,
): Config {
  const steps: DriveStep[] = TOUR_STEPS[surface]
    .filter(
      (s) =>
        typeof document !== "undefined" && document.querySelector(s.element),
    )
    .map((s) => ({
      element: s.element,
      popover: {
        title: t(`steps.${surface}.${s.key}.title`),
        description: t(`steps.${surface}.${s.key}.description`),
        side: s.side,
        align: "center" as const,
      },
    }));

  return {
    steps,
    showProgress: steps.length > 1,
    progressText: "{{current}} / {{total}}",
    showButtons: ["next", "previous", "close"],
    nextBtnText: t("next"),
    prevBtnText: t("prev"),
    doneBtnText: t("done"),
    overlayColor: "#09090b",
    overlayOpacity: 0.75,
    popoverClass: "fitmusc-tour",
    smoothScroll: true,
    // Spotlighted elements (e.g. nav tabs) stay non-interactive so the user
    // advances with the Next button instead of navigating away mid-tour.
    disableActiveInteraction: true,
    // Fires on completion AND on close/Esc/overlay-click — all count as "seen".
    onDestroyed: () => onDone(),
  };
}
