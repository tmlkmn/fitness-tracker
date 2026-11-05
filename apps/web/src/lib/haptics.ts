function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Silently ignore — vibration unsupported or blocked
  }
}

export function hapticTap(): void {
  vibrate(10);
}

export function hapticImpact(): void {
  vibrate(20);
}

export function hapticSuccess(): void {
  vibrate([15, 40, 15]);
}

export function hapticError(): void {
  vibrate([40, 30, 40]);
}
