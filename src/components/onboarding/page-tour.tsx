"use client";

import { useEffect, useRef } from "react";
import "driver.js/dist/driver.css";
import { useGuidedTour } from "@/hooks/use-guided-tour";
import { isTourDone, type TourSurface } from "@/lib/onboarding-storage";

interface PageTourProps {
  surface: TourSurface;
  /**
   * Gate the auto-run until the page's anchors are painted (data loaded,
   * onboarding modals closed). Defaults to `true`.
   */
  ready?: boolean;
}

/**
 * Runs the guided tour for `surface` once, on first visit. Mounting this
 * component anywhere on a page is enough. It also listens for a
 * `fitmusc:start-tour` window event so the tour can be re-launched explicitly
 * (e.g. when the user finishes the carousel from the header menu).
 */
export function PageTour({ surface, ready = true }: PageTourProps) {
  const { start } = useGuidedTour();
  const startedRef = useRef(false);

  // First-visit auto-run.
  useEffect(() => {
    if (!ready || startedRef.current || isTourDone(surface)) return;
    startedRef.current = true;
    // Two frames so conditionally-rendered anchors are laid out.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => start(surface));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [ready, surface, start]);

  // Explicit re-launch.
  useEffect(() => {
    function onStartTour(e: Event) {
      if ((e as CustomEvent).detail === surface) start(surface);
    }
    window.addEventListener("fitmusc:start-tour", onStartTour);
    return () => window.removeEventListener("fitmusc:start-tour", onStartTour);
  }, [surface, start]);

  return null;
}
