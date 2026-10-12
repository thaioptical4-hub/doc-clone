import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listDepartments, renameDepartment, setDepartmentActive } from "@/lib/departmentStore"
import { cleanDepartmentName } from "@/lib/departments"

/** Rename (`name`, optional `renameDocuments`) and/or show/hide (`active`) one department. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.role !== "admin") return NextResponse.json({ error: "สำหรับผู้ดูแลระบบเท่านั้น" }, { status: 403 })
    const id = Number((await params).id)
    const body = await request.json()
    const all = await listDepartments(true)
    if (!all.some((d) => d.id === id)) return NextResponse.json({ error: "ไม่พบหน่วยงาน" }, { status: 404 })

    let updatedDocuments = 0
    if (body.name !== undefined) {
      const cleaned = cleanDepartmentName(body.name, all, id)
      if ("error" in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 })
      updatedDocuments = (await renameDepartment(id, cleaned.name, body.renameDocuments === true)).updatedDocuments
    }
    if (typeof body.active === "boolean") {
      const activeLeft = all.filter((d) => d.active && d.id !== id).length
      if (!body.active && activeLeft === 0) {
        return NextResponse.json({ error: "ต้องเหลือหน่วยงานที่แสดงอย่างน้อย 1 หน่วยงาน" }, { status: 400 })
      }
      await setDepartmentActive(id, body.active)
    }
    return NextResponse.json({ ok: true, updatedDocuments, departments: await listDepartments(true) })
  } catch (error) {
    console.error("PATCH /api/departments/[id] error:", error)
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 })
  }
}
