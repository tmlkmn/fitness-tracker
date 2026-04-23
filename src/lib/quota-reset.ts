const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getNextQuotaReset(now: Date = new Date()): Date {
  const turkeyNow = new Date(now.getTime() + TURKEY_OFFSET_MS);
  const nextTurkeyMidnight = Date.UTC(
    turkeyNow.getUTCFullYear(),
    turkeyNow.getUTCMonth(),
    turkeyNow.getUTCDate() + 1,
  );
  return new Date(nextTurkeyMidnight - TURKEY_OFFSET_MS);
}

export function formatTimeUntilReset(
  resetAt: Date,
  nowMs: number = Date.now(),
): string {
  const diffMs = resetAt.getTime() - nowMs;
  if (diffMs <= 0) return "yakında";
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}dk`;
  if (minutes === 0) return `${hours}sa`;
  return `${hours}sa ${minutes}dk`;
}
