import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

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

export function proxy(request: NextRequest) {
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

  if (!sessionToken) {
    // Determine target locale from current path or default
    const localeMatch = pathname.match(/^\/(tr|en)\b/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
    const loginPath = locale === "en" ? "/en/login" : "/tr/giris";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-.*\\.png|sw.js|sw.js.map|sw-push.js|manifest.webmanifest|icon\\.png|icon-.*\\.png|apple-touch-icon.png|serwist-worker-.*).*)",
  ],
};
