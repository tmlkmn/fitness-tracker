import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const { GET: authGet, POST: authPost } = toNextJsHandler(auth);

export { authGet as GET };

export async function POST(request: NextRequest) {
  const url = new URL(request.url);

  // Rate limit login attempts
  if (url.pathname === "/api/auth/sign-in/email") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    try {
      checkRateLimit(`login:${ip}`, RATE_LIMITS.login.maxAttempts, RATE_LIMITS.login.windowMs);
    } catch {
      return NextResponse.json(
        { error: "Çok fazla giriş denemesi. Lütfen 15 dakika bekleyin." },
        { status: 429 },
      );
    }
  }

  return authPost(request);
}
