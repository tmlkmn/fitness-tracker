import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/giris", "/bekliyor", "/uyelik-doldu", "/sifremi-unuttum", "/sifre-sifirla", "/api/auth", "/api/cron"];

function isPublic(pathname: string) {
  return publicPaths.some((p) => pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Check for better-auth session cookie
  const sessionToken =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/giris", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-.*\\.png|sw.js|sw.js.map|sw-push.js|manifest.json|icon\\.svg|icon-192.png|icon-512.png|apple-touch-icon.png|serwist-worker-.*).*)",
  ],
};
