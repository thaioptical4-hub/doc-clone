import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { addDepartment, listDepartments } from "@/lib/departmentStore"
import { cleanDepartmentName } from "@/lib/departments"

export const dynamic = "force-dynamic"

/** Active departments for the send form; `?all=1` (admins only) also returns hidden ones. */
export async function GET(request: Request) {
  try {
    const all = new URL(request.url).searchParams.get("all") === "1"
    if (all) {
      const session = await auth()
      if (session?.role !== "admin") return NextResponse.json({ error: "สำหรับผู้ดูแลระบบเท่านั้น" }, { status: 403 })
    }
    return NextResponse.json(await listDepartments(all))
  } catch (error) {
    console.error("GET /api/departments error:", error)
    return NextResponse.json({ error: "โหลดรายชื่อหน่วยงานไม่สำเร็จ" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (session?.role !== "admin") return NextResponse.json({ error: "สำหรับผู้ดูแลระบบเท่านั้น" }, { status: 403 })
    const body = await request.json()
    const cleaned = cleanDepartmentName(body.name, await listDepartments(true))
    if ("error" in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 })
    return NextResponse.json(await addDepartment(cleaned.name), { status: 201 })
  } catch (error) {
    console.error("POST /api/departments error:", error)
    return NextResponse.json({ error: "เพิ่มหน่วยงานไม่สำเร็จ" }, { status: 500 })
  }
}
