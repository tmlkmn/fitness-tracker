"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { hapticImpact } from "@/lib/haptics";

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    "standalone" in navigator &&
    (navigator as unknown as { standalone: boolean }).standalone;
  const dmStandalone = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  return Boolean(iosStandalone || dmStandalone);
}

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    setEnabled(isStandaloneDisplay());
  }, []);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || refreshing) return;
      // Only activate when scrolled to top
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      setPulling(true);
    },
    [enabled, refreshing]
  );

  const crossedThresholdRef = useRef(false);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        // Apply resistance — pull distance grows slower the further you pull
        const next = Math.min(delta * 0.4, 120);
        setPullDistance(next);
        if (next >= THRESHOLD && !crossedThresholdRef.current) {
          crossedThresholdRef.current = true;
          hapticImpact();
        } else if (next < THRESHOLD && crossedThresholdRef.current) {
          crossedThresholdRef.current = false;
        }
      } else {
        setPullDistance(0);
      }
    },
    [pulling, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    crossedThresholdRef.current = false;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.5);
      try {
        await qc.invalidateQueries();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance, qc]);

  if (!enabled) return <>{children}</>;

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pullDistance > 5 ? pullDistance : 0 }}
      >
        <Loader2
          className="h-5 w-5 text-muted-foreground transition-opacity"
          style={{
            opacity: progress,
            animation: refreshing ? "spin 1s linear infinite" : "none",
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
