import { NextResponse } from "next/server"
import { createDocument, getDocuments, setSheetRow } from "@/lib/db"
import { appendDocumentRow } from "@/lib/googleSheets"
import type { DocStatus } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const docType = typeof body.doc_type === "string" ? body.doc_type.trim() : ""
    const senderName = typeof body.sender_name === "string" ? body.sender_name.trim() : ""
    const recipientName = typeof body.recipient_name === "string" ? body.recipient_name.trim() : ""

    if (!docType || !senderName || !recipientName) {
      return NextResponse.json({ error: "กรุณากรอกประเภทเอกสาร ชื่อผู้ส่ง และชื่อผู้รับให้ครบ" }, { status: 400 })
    }

    const doc = await createDocument({
      doc_type: docType,
      sender_name: senderName,
      recipient_name: recipientName,
      description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
      photos_sender: Array.isArray(body.photos_sender) ? body.photos_sender.slice(0, 5) : undefined,
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
    const message = error instanceof Error && error.message === "Attachment too large"
      ? "รูปภาพมีขนาดใหญ่เกิน 5 MB กรุณาเลือกรูปใหม่"
      : error instanceof Error && error.message === "Invalid attachment format"
        ? "รูปภาพมีรูปแบบไม่ถูกต้อง กรุณาเลือกรูปใหม่"
        : "บันทึกเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง"
    return NextResponse.json({ error: message }, { status: 500 })
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
