import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth()
  const isAuth = !!session

  const isAuthPage = request.nextUrl.pathname.startsWith("/login")
  const isApiRoute = request.nextUrl.pathname.startsWith("/api")
  const isPublic = [".svg", ".png", ".ico", "manifest.json"].some((ext) =>
    request.nextUrl.pathname.endsWith(ext)
  )

  if (isPublic) return NextResponse.next()
  if (isAuthPage) {
    if (isAuth) return NextResponse.redirect(new URL("/", request.url))
    return NextResponse.next()
  }
  if (!isAuth) {
    if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
