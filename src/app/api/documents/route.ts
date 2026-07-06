import { NextResponse } from "next/server"
import { createDocument, getDocuments, setSheetRow } from "@/lib/db"
import { appendDocumentRow } from "@/lib/googleSheets"
import type { DocStatus } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const doc = await createDocument({
      doc_type: body.doc_type,
      sender_name: body.sender_name,
      recipient_name: body.recipient_name,
      description: body.description,
      photo_sender: body.photo_sender,
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
