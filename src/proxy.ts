import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getCookieCache } from "better-auth/cookies";
import { routing } from "@/i18n/routing";
import {
  resolveStatusRouteKey,
  statusRoutePath,
  STATUS_ROUTES,
  type StatusRouteFields,
} from "@/lib/account-status-route";

const intlMiddleware = createIntlMiddleware(routing);

// Public route names — locale-agnostic (TR canonical, e.g. "/giris" matches both "/tr/giris" and "/en/login").
// These are the localized PathNames keys without locale prefix.
const PUBLIC_PATTERNS: RegExp[] = [
  /^\/giris$/,
  /^\/login$/,
  /^\/bekliyor$/,
  /^\/pending$/,
  /^\/uyelik-doldu$/,
  /^\/membership-expired$/,
  /^\/sifremi-unuttum$/,
  /^\/forgot-password$/,
  /^\/sifre-sifirla(\/.*)?$/,
  /^\/reset-password(\/.*)?$/,
  /^\/gizlilik$/,
  /^\/privacy$/,
  /^\/kvkk$/,
  /^\/kullanim-sartlari$/,
  /^\/terms$/,
  /^\/tanitim$/,
  /^\/about$/,
  /^\/kayit$/,
  /^\/signup$/,
  /^\/deneme-bitti$/,
  /^\/trial-expired$/,
  /^\/fiyatlandirma$/,
  /^\/pricing$/,
  /^\/iade-politikasi$/,
  /^\/refund-policy$/,
  /^\/cerez-politikasi$/,
  /^\/cookie-policy$/,
  /^\/iletisim$/,
  /^\/contact$/,
  /^\/feragatname$/,
  /^\/disclaimer$/,
];

function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(tr|en)(\/.*)?$/);
  if (match) {
    return match[2] || "/";
  }
  return pathname;
}

function isPublic(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  if (stripped === "/") return false;
  return PUBLIC_PATTERNS.some((rx) => rx.test(stripped));
}

// Every localized status-page path (both locales), used to short-circuit the
// status gate so a blocked user parked on their own status page (or any other
// status page) is never redirected in a loop.
const STATUS_PATHS = new Set<string>(
  Object.values(STATUS_ROUTES).flatMap((r) => [r.tr, r.en]),
);

function localeFromPath(pathname: string): "tr" | "en" {
  const match = /^\/(tr|en)\b/.exec(pathname);
  return match ? (match[1] as "tr" | "en") : routing.defaultLocale;
}

/**
 * Status gate — a frozen / unapproved / lapsed / temp-password account is
 * routed to its status page instead of the app. Reads the cached session from
 * the signed cookie (better-auth cookieCache, 5-min TTL) rather than hitting
 * the DB. When the cache is absent or unreadable we fail open: the
 * server-action / API-route layer (getAuthUser / requireApiUser) still enforces
 * the same gate, so this is a UX redirect, not the security boundary.
 *
 * Returns a redirect response when the account is blocked, or null to continue.
 */
async function statusRedirect(
  request: NextRequest,
  pathname: string,
  locale: "tr" | "en",
): Promise<NextResponse | null> {
  if (STATUS_PATHS.has(stripLocale(pathname))) return null;
  try {
    const cached = await getCookieCache(request, {
      secret: process.env.BETTER_AUTH_SECRET,
    });
    const user = cached?.user as StatusRouteFields | undefined;
    if (!user) return null;
    const key = resolveStatusRouteKey(user);
    if (!key) return null;
    const target = statusRoutePath(key, locale);
    return NextResponse.redirect(new URL(`/${locale}${target}`, request.url));
  } catch {
    // Unreadable cache — let the app-layer gate handle it.
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes are locale-agnostic — let next-intl skip them, no auth needed for /api/auth + /api/cron
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    // Other API routes still need auth via getAuthSession() in their handlers; proxy is bypassed
    return NextResponse.next();
  }

  // Public pages: let next-intl handle locale resolve/redirect, no auth required
  if (isPublic(pathname)) {
    return intlMiddleware(request);
  }

  // Auth check — session cookie required for any non-public app route
  const sessionToken =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  const locale = localeFromPath(pathname);

  if (!sessionToken) {
    const loginPath = locale === "en" ? "/en/login" : "/tr/giris";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const redirect = await statusRedirect(request, pathname, locale);
  if (redirect) return redirect;

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-.*\\.png|sw.js|sw.js.map|sw-push.js|manifest.webmanifest|icon\\.png|icon-.*\\.png|apple-touch-icon.png|serwist-worker-.*).*)",
  ],
};
