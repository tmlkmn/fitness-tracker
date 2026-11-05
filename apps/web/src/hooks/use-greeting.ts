import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getDailyGreeting, type DailyGreeting } from "@/actions/ai-greeting";
import { getTurkeyTodayStr } from "@/lib/utils";

// The daily greeting is deterministic for a given (date, locale): it is
// generated once per day server-side and then served from a DB cache. React
// Query's in-memory cache, however, resets on every fresh page load (hard
// reload, reopening the PWA, returning later), so the value was re-fetched —
// round-trip + skeleton — on every visit even though the content never changed.
// We mirror it into localStorage keyed by date so repeat loads render it
// instantly with no skeleton and no server round-trip.

function cacheKey(locale: string, date: string): string {
  return `greeting:${locale}:${date}`;
}

function readCachedGreeting(locale: string, date: string): DailyGreeting | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(cacheKey(locale, date));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as DailyGreeting;
    if (typeof parsed?.message === "string" && typeof parsed?.firstName === "string") {
      return parsed;
    }
  } catch {
    // ignore malformed / unavailable storage
  }
  return undefined;
}

function writeCachedGreeting(locale: string, date: string, value: DailyGreeting): void {
  if (typeof window === "undefined") return;
  try {
    // Drop stale entries from previous days so storage doesn't grow unbounded.
    const prefix = `greeting:${locale}:`;
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix) && key !== cacheKey(locale, date)) {
        window.localStorage.removeItem(key);
      }
    }
    window.localStorage.setItem(cacheKey(locale, date), JSON.stringify(value));
  } catch {
    // ignore quota / unavailable storage
  }
}

export function useDailyGreeting() {
  const locale = useLocale();
  const today = getTurkeyTodayStr();
  return useQuery({
    queryKey: ["dashboard.greeting", locale, today],
    queryFn: async () => {
      const result = await getDailyGreeting();
      writeCachedGreeting(locale, today, result);
      return result;
    },
    initialData: () => readCachedGreeting(locale, today),
    // The cached value is for `today`, so treat it as fresh: within staleTime
    // React Query won't fire a background refetch, avoiding a server round-trip
    // on every load when we already have today's greeting.
    initialDataUpdatedAt: () => Date.now(),
    staleTime: 1000 * 60 * 60 * 6,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
