"use client";

import { useCallback } from "react";
import { driver } from "driver.js";
import { useTranslations } from "next-intl";
import { buildDriverConfig } from "@/lib/onboarding-tours";
import { markTourDone, type TourSurface } from "@/lib/onboarding-storage";

/**
 * Starts a driver.js guided tour for a given surface. The caller decides
 * *when* to run it (first visit vs. explicit re-launch) — this hook only
 * builds and drives the tour.
 */
export function useGuidedTour() {
  const t = useTranslations("onboarding.tour");

  const start = useCallback(
    (surface: TourSurface) => {
      const config = buildDriverConfig(
        surface,
        (key) => t(key),
        () => markTourDone(surface),
      );
      // No anchors painted yet — skip without marking done so the next
      // visit can retry.
      if (!config.steps || config.steps.length === 0) return;
      driver(config).drive();
    },
    [t],
  );

  return { start };
}
