import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const LOGIN_RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000
const rateLimit = new Map<string, { count: number; resetTime: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > LOGIN_RATE_LIMIT
}

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ")

export async function middleware(request: NextRequest) {
  const session = await auth()
  const isAuth = !!session

  const isAuthPage = request.nextUrl.pathname.startsWith("/login")
  const isApiRoute = request.nextUrl.pathname.startsWith("/api")
  const isNextAuthRoute = request.nextUrl.pathname.startsWith("/api/auth")
  const isPublic = [".svg", ".png", ".ico", "manifest.json"].some((ext) =>
    request.nextUrl.pathname.endsWith(ext)
  )

  if (
    request.nextUrl.pathname === "/api/auth/callback/credentials" &&
    request.method === "POST"
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    }
  }

  if (isPublic || isNextAuthRoute) {
    const res = NextResponse.next()
    res.headers.set("Content-Security-Policy", CSP)
    return res
  }
  if (isAuthPage) {
    if (isAuth) return NextResponse.redirect(new URL("/", request.url))
    const res = NextResponse.next()
    res.headers.set("Content-Security-Policy", CSP)
    return res
  }
  if (!isAuth) {
    if (isApiRoute)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.redirect(new URL("/login", request.url))
  }
  const res = NextResponse.next()
  res.headers.set("Content-Security-Policy", CSP)
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
