import { NextResponse, after } from "next/server"
import { getDocument, confirmDocument, deleteDocument } from "@/lib/db"
import { parseImageDataUrl, uploadFileToDrive, getOrCreateDateFolder } from "@/lib/googleDrive"
import { updateDocumentRow } from "@/lib/googleSheets"
import type { AttachmentKind } from "@/lib/types"

// Leaves room for the Drive/Sheets backup that runs after the response has been sent.
export const maxDuration = 60

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
    if (!body.photo_recipient || !body.signature_recipient) {
      return NextResponse.json({ error: "ต้องมีรูปหลังส่งและลายเซ็นผู้รับ" }, { status: 400 })
    }
    const existing = await getDocument(Number(id))
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.status === "confirmed") {
      return NextResponse.json({ error: "เอกสารนี้ยืนยันรับแล้ว" }, { status: 409 })
    }
    const doc = await confirmDocument(Number(id), {
      photo_recipient: body.photo_recipient,
      signature_recipient: body.signature_recipient,
    })
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Reply as soon as the database has the confirmation; the Google Drive/Sheets backup
    // (several sequential uploads) used to run here and kept the iPad spinning.
    const documentId = id
    after(async () => {
      try {
        const docLabel = doc.doc_type.replace(/\s+/g, "-")
        const dateLabel = new Date(doc.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
        const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
        const dateFolderId = rootFolderId ? await getOrCreateDateFolder(rootFolderId, dateLabel) : undefined

        const linkGroups: Record<"senderPhoto" | "senderSignature" | "recipientPhoto" | "recipientSignature", string[]> = {
          senderPhoto: [],
          senderSignature: [],
          recipientPhoto: [],
          recipientSignature: [],
        }

        const uploads = await Promise.all(
          doc.attachments.map(async (attachment) => {
            const { buffer, mimeType, extension } = parseImageDataUrl(attachment.data)
            const filename = `doc-${doc.id}-${docLabel}-${attachment.kind}-${attachment.id}.${extension}`
            return { attachment, uploaded: await uploadFileToDrive(buffer, filename, mimeType, dateFolderId || undefined) }
          })
        )
        for (const { attachment, uploaded } of uploads) {
          if (uploaded) linkGroups[LINK_FIELD[attachment.kind]].push(uploaded.webViewLink)
        }

        if (doc.sheet_row) {
          await updateDocumentRow(doc.sheet_row, {
            updated_at: doc.updated_at,
            links: {
              senderPhoto: linkGroups.senderPhoto.join("\n"),
              senderSignature: linkGroups.senderSignature.join("\n"),
              recipientPhoto: linkGroups.recipientPhoto.join("\n"),
              recipientSignature: linkGroups.recipientSignature.join("\n"),
            },
          })
        }
      } catch (driveError) {
        console.error("Google Drive/Sheets backup failed for document", documentId, driveError)
      }
    })

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
