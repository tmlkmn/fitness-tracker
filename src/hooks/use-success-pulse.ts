"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Triggers a brief (~600ms) green pulse animation on a target element via
 * the `.animate-success-pulse` utility. Use after an optimistic mutation
 * resolves to confirm the action without a separate toast.
 *
 * Usage:
 *   const { pulseProps, trigger } = useSuccessPulse();
 *   <div {...pulseProps} />  // attach className + key
 *   onSuccess: () => trigger()
 */
export function useSuccessPulse() {
  const [pulseKey, setPulseKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPulseKey((k) => k + 1);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
    }, 700);
  }, []);

  return {
    trigger,
    pulseProps: {
      key: pulseKey || undefined,
      className: pulseKey ? "animate-success-pulse" : "",
    } as const,
    pulseClass: pulseKey ? "animate-success-pulse" : "",
    pulseKey,
  };
}
