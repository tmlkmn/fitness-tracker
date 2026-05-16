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
    { element: '[data-tour="today-plan"]', key: "today", side: "bottom" },
    { element: '[data-tour="quick-access"]', key: "quickAccess", side: "top" },
    { element: '[data-tour="nav-calendar"]', key: "calendar", side: "top" },
    { element: '[data-tour="nav-assistant"]', key: "assistant", side: "top" },
    { element: '[data-tour="nav-progress"]', key: "progress", side: "top" },
    { element: '[data-tour="getting-started"]', key: "checklist", side: "bottom" },
  ],
  calendar: [
    { element: '[data-tour="ai-weekly"]', key: "generate", side: "bottom" },
    { element: '[data-tour="week-strip"]', key: "weekStrip", side: "bottom" },
    { element: '[data-tour="day-detail"]', key: "dayDetail", side: "top" },
  ],
  day: [
    { element: '[data-tour="day-tabs"]', key: "tabs", side: "bottom" },
    { element: '[data-tour="day-content"]', key: "track", side: "top" },
  ],
  progress: [
    { element: '[data-tour="progress-chart"]', key: "chart", side: "bottom" },
    { element: '[data-tour="add-measurement"]', key: "add", side: "top" },
  ],
};

/**
 * Build a driver.js config for a surface. Steps whose anchor element is not
 * currently in the DOM are dropped — so a conditionally-rendered target (e.g.
 * the calendar's AI button) never leaves an orphan popover.
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
