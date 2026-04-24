"use client";

import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  ariaLabel?: string;
}

export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 12,
  className,
  trackClassName,
  indicatorClassName,
  ariaLabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const dashOffset = circumference * (1 - ratio);

  return (
    <svg
      className={cn("block", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className={cn("opacity-20", trackClassName ?? "stroke-muted-foreground")}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={cn(
          "transition-[stroke-dashoffset] duration-700 ease-out",
          indicatorClassName ?? "stroke-primary",
        )}
      />
    </svg>
  );
}

export interface RingDef {
  value: number;
  max: number;
  trackClassName?: string;
  indicatorClassName: string;
  label: string;
}

export interface MultiProgressRingProps {
  size?: number;
  strokeWidth?: number;
  gap?: number;
  rings: RingDef[];
  className?: string;
  centerSlot?: React.ReactNode;
}

export function MultiProgressRing({
  size = 160,
  strokeWidth = 12,
  gap = 4,
  rings,
  className,
  centerSlot,
}: MultiProgressRingProps) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {rings.map((ring, i) => {
        const ringSize = size - i * (strokeWidth * 2 + gap);
        if (ringSize <= strokeWidth * 2) return null;
        return (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden={i > 0 ? true : undefined}
          >
            <ProgressRing
              value={ring.value}
              max={ring.max}
              size={ringSize}
              strokeWidth={strokeWidth}
              trackClassName={ring.trackClassName}
              indicatorClassName={ring.indicatorClassName}
              ariaLabel={ring.label}
            />
          </div>
        );
      })}
      {centerSlot && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {centerSlot}
        </div>
      )}
    </div>
  );
}
