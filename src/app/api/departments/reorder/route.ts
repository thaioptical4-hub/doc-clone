import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listDepartments, reorderDepartments } from "@/lib/departmentStore"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (session?.role !== "admin") return NextResponse.json({ error: "สำหรับผู้ดูแลระบบเท่านั้น" }, { status: 403 })
    const body = await request.json()
    const known = new Set((await listDepartments(true)).map((d) => d.id))
    const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter((id: number) => known.has(id)) : []
    if (!ids.length) return NextResponse.json({ error: "ลำดับไม่ถูกต้อง" }, { status: 400 })
    await reorderDepartments(ids)
    return NextResponse.json({ ok: true, departments: await listDepartments(true) })
  } catch (error) {
    console.error("POST /api/departments/reorder error:", error)
    return NextResponse.json({ error: "บันทึกลำดับไม่สำเร็จ" }, { status: 500 })
  }
}
