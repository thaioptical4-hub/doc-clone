import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getStoredAdmin, saveStoredAdmin } from "@/lib/adminStore"
import { envAdminConfigured, validateNewAdmin } from "@/lib/roles"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const stored = await getStoredAdmin()
    return NextResponse.json({
      managedByEnv: envAdminConfigured(),
      username: envAdminConfigured() ? process.env.ADMIN_USER : stored?.username ?? null,
    })
  } catch (error) {
    console.error("GET /api/settings/admin error:", error)
    return NextResponse.json({ error: "โหลดการตั้งค่าไม่สำเร็จ" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Middleware already limits this to admins; check again here so the route is safe on its own.
    const session = await auth()
    if (session?.role !== "admin") return NextResponse.json({ error: "สำหรับผู้ดูแลระบบเท่านั้น" }, { status: 403 })
    if (envAdminConfigured()) {
      return NextResponse.json({ error: "บัญชี Admin ถูกตั้งไว้ใน Vercel แก้ไขจากหน้านี้ไม่ได้" }, { status: 409 })
    }

    const body = await request.json()
    const username = typeof body.username === "string" ? body.username.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const confirm = typeof body.confirm === "string" ? body.confirm : ""
    const problem = validateNewAdmin(username, password, confirm)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })

    await saveStoredAdmin(username, password)
    return NextResponse.json({ ok: true, username })
  } catch (error) {
    console.error("POST /api/settings/admin error:", error)
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 })
  }
}
