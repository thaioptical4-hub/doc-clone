import { NextResponse } from "next/server"
import { getDocument, confirmDocument, deleteDocument } from "@/lib/db"
import { parseImageDataUrl, uploadFileToDrive } from "@/lib/googleDrive"
import { updateDocumentRow } from "@/lib/googleSheets"
import type { AttachmentKind } from "@/lib/types"

const LINK_FIELD: Record<AttachmentKind, "senderPhoto" | "senderSignature" | "recipientPhoto" | "recipientSignature"> = {
  photo_sender: "senderPhoto",
  signature_sender: "senderSignature",
  photo_recipient: "recipientPhoto",
  signature_recipient: "recipientSignature",
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const doc = await getDocument(Number(id))
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(doc)
  } catch (error) {
    console.error("GET /api/documents/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const doc = await confirmDocument(Number(id), {
      photo_recipient: body.photo_recipient,
      signature_recipient: body.signature_recipient,
    })
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

    try {
      const docLabel = doc.doc_type.replace(/\s+/g, "-")
      const links: Partial<Record<"senderPhoto" | "senderSignature" | "recipientPhoto" | "recipientSignature", string>> = {}

      for (const attachment of doc.attachments) {
        const { buffer, mimeType, extension } = parseImageDataUrl(attachment.data)
        const filename = `doc-${doc.id}-${docLabel}-${attachment.kind}.${extension}`
        const uploaded = await uploadFileToDrive(buffer, filename, mimeType)
        if (uploaded) links[LINK_FIELD[attachment.kind]] = uploaded.webViewLink
      }

      if (doc.sheet_row) {
        await updateDocumentRow(doc.sheet_row, { updated_at: doc.updated_at, links })
      }
    } catch (driveError) {
      console.error("Google Drive/Sheets backup failed for document", id, driveError)
    }

    return NextResponse.json(doc)
  } catch (error) {
    console.error("PATCH /api/documents/[id] error:", error)
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteDocument(Number(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/documents/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
