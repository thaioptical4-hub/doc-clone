import { NextResponse } from "next/server"
import { createDocument, getDocuments, setSheetRow } from "@/lib/db"
import { appendDocumentRow } from "@/lib/googleSheets"
import { normalizeDepartment } from "@/lib/departments"
import type { DocStatus } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const photos: string[] = Array.isArray(body.photos_sender) ? body.photos_sender.slice(0, 5) : []
    const senderDepartment = normalizeDepartment(body.sender_department)
    const recipientDepartment = normalizeDepartment(body.recipient_department)

    if (!body.doc_type || !body.sender_name || !body.recipient_name) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 })
    }
    if (!senderDepartment || !recipientDepartment) {
      return NextResponse.json({ error: "กรุณาเลือกหน่วยงานผู้ส่งและผู้รับ" }, { status: 400 })
    }
    if (photos.length === 0) {
      return NextResponse.json({ error: "กรุณาถ่ายรูปเอกสารก่อนส่งอย่างน้อย 1 รูป" }, { status: 400 })
    }

    const doc = await createDocument({
      doc_type: body.doc_type,
      sender_name: body.sender_name,
      recipient_name: body.recipient_name,
      sender_department: senderDepartment,
      recipient_department: recipientDepartment,
      description: body.description,
      photos_sender: photos,
      signature_sender: body.signature_sender,
    })

    try {
      const row = await appendDocumentRow(doc)
      if (row) await setSheetRow(doc.id, row)
    } catch (sheetError) {
      console.error("Google Sheets logging failed for document", doc.id, sheetError)
    }

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error("POST /api/documents error:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as DocStatus | null
    const docs = await getDocuments(status || undefined)
    return NextResponse.json(docs)
  } catch (error) {
    console.error("GET /api/documents error:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}
