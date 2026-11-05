"use client";

import { useEffect, useRef } from "react";
import "driver.js/dist/driver.css";
import { useGuidedTour } from "@/hooks/use-guided-tour";
import { isTourDone, type TourSurface } from "@/lib/onboarding-storage";
import { countTourAnchors } from "@/lib/onboarding-tours";

interface PageTourProps {
  surface: TourSurface;
  /**
   * Gate the auto-run until the page is past its first paint (data loaded,
   * onboarding modals closed). Defaults to `true`.
   */
  ready?: boolean;
}

/**
 * Runs the guided tour for `surface` once, on first visit. Mounting this
 * component anywhere on a page is enough. It also listens for a
 * `fitmusc:start-tour` window event so the tour can be re-launched explicitly
 * (header menu "page guide", or after the carousel finishes).
 */
export function PageTour({ surface, ready = true }: PageTourProps) {
  const { start } = useGuidedTour();
  const startedRef = useRef(false);

  // First-visit auto-run. Cards on these pages load asynchronously, so instead
  // of a fixed delay we poll until the set of anchors has stopped growing
  // (content painted) — capped at 3s so an empty page still starts.
  useEffect(() => {
    if (!ready || startedRef.current || isTourDone(surface)) return;
    startedRef.current = true;

    let cancelled = false;
    let timer = 0;
    let lastCount = -1;
    let stableTicks = 0;
    const startedAt = Date.now();

    const tick = () => {
      if (cancelled) return;
      const count = countTourAnchors(surface);
      if (count === lastCount) {
        stableTicks += 1;
      } else {
        stableTicks = 0;
        lastCount = count;
      }
      const elapsed = Date.now() - startedAt;
      if ((count > 0 && stableTicks >= 2) || elapsed > 3000) {
        start(surface);
        return;
      }
      timer = window.setTimeout(tick, 200);
    };

    timer = window.setTimeout(tick, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, surface, start]);

  // Explicit re-launch — ignores the "done" flag so it always replays.
  useEffect(() => {
    function onStartTour(e: Event) {
      if ((e as CustomEvent).detail === surface) start(surface);
    }
    window.addEventListener("fitmusc:start-tour", onStartTour);
    return () => window.removeEventListener("fitmusc:start-tour", onStartTour);
  }, [surface, start]);

  return null;
}
