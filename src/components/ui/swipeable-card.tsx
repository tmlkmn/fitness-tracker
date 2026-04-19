"use client";

import { useRef, useState, type ReactNode } from "react";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
}

const THRESHOLD = 80;

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = "Sil",
  rightLabel = "Tamamla",
}: SwipeableCardProps) {
  const startX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX.current;
    // Limit the swipe distance
    const clamped = Math.max(-120, Math.min(120, diff));
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offsetX < -THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    } else if (offsetX > THRESHOLD && onSwipeRight) {
      onSwipeRight();
    }
    setOffsetX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions */}
      {onSwipeRight && offsetX > 0 && (
        <div className="absolute inset-y-0 left-0 flex items-center px-4 bg-green-600 rounded-l-lg"
          style={{ width: Math.abs(offsetX) }}
        >
          <span className="text-xs text-white font-medium">{rightLabel}</span>
        </div>
      )}
      {onSwipeLeft && offsetX < 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-destructive rounded-r-lg"
          style={{ width: Math.abs(offsetX) }}
        >
          <span className="text-xs text-white font-medium">{leftLabel}</span>
        </div>
      )}
      {/* Card content */}
      <div
        className="relative z-10 transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
