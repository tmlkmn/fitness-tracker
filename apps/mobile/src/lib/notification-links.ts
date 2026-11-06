import type { Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { API_URL } from "./config";

// Notifications carry a web path (`link`, or a push's `data.url`) — e.g.
// "/tr/paylasilan" or "/en/settings". Map the ones the app has a screen for;
// anything else (admin, billing pages) opens on the web.

type Target = { screen: Href } | { web: string } | null;

const ROUTES: [RegExp, (id: string) => Href][] = [
  [/^\/?$/, () => "/"],
  [/^\/(paylasilan|shared)$/, () => "/sharing"],
  [/^\/(paylasilan\/hafta|shared\/week)\/(\d+)$/, (id) => ({ pathname: "/shared/week/[weeklyPlanId]", params: { weeklyPlanId: id } })],
  [/^\/(paylasilan\/gun|shared\/day)\/(\d+)$/, (id) => ({ pathname: "/shared/day/[dayId]", params: { dayId: id } })],
  [/^\/(gun|day)\/(\d+)$/, (id) => ({ pathname: "/day/[dayId]", params: { dayId: id } })],
  [/^\/(takvim|calendar)$/, () => "/calendar"],
  [/^\/(ilerleme|progress)$/, () => "/progress"],
  [/^\/(asistan|assistant)$/, () => "/assistant"],
  [/^\/(ayarlar|settings)$/, () => "/settings"],
  [/^\/(alisveris|shopping)$/, () => "/shopping"],
];

/** Where a notification leads. Meal / workout reminders have no link — they open Today. */
export function notificationTarget(link: string | null | undefined, type?: string | null): Target {
  if (!link) return type === "reminder_meal" || type === "reminder_workout" ? { screen: "/" } : null;
  const path = link.split(/[?#]/)[0].replace(/^\/(tr|en)(?=\/|$)/, "") || "/";
  for (const [pattern, href] of ROUTES) {
    const match = pattern.exec(path);
    if (match) return { screen: href(match[2] ?? "") };
  }
  return link.startsWith("/") ? { web: `${API_URL}${link}` } : null;
}

export function openTarget(target: Target, navigate: (href: Href) => void) {
  if (!target) return;
  if ("web" in target) void WebBrowser.openBrowserAsync(target.web);
  else navigate(target.screen);
}
