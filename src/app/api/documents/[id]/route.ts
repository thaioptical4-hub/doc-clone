import { NextResponse } from "next/server"
import { getDocument, confirmDocument, deleteDocument } from "@/lib/db"
import { parseImageDataUrl, uploadFileToDrive } from "@/lib/googleDrive"

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
      for (const attachment of doc.attachments) {
        const { buffer, mimeType, extension } = parseImageDataUrl(attachment.data)
        const filename = `doc-${doc.id}-${docLabel}-${attachment.kind}.${extension}`
        await uploadFileToDrive(buffer, filename, mimeType)
      }
    } catch (driveError) {
      console.error("Google Drive backup failed for document", id, driveError)
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
