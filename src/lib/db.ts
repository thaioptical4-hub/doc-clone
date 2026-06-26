import { neon } from "@neondatabase/serverless"
import type { Document, Attachment, DocStatus, AttachmentKind } from "./types"

const sql = neon(process.env.POSTGRES_URL!)

export async function createDocument(params: {
  doc_type: string
  sender_name: string
  recipient_name: string
  description?: string
  photo_sender?: string
  signature_sender?: string
}): Promise<Document> {
  const rows = await sql`
    INSERT INTO documents (doc_type, sender_name, recipient_name, description, status)
    VALUES (${params.doc_type}, ${params.sender_name}, ${params.recipient_name}, ${params.description || null}, 'sent')
    RETURNING *
  `
  const doc = rows[0] as Document

  if (params.photo_sender) {
    await addAttachment(doc.id, "photo_sender", params.photo_sender)
  }
  if (params.signature_sender) {
    await addAttachment(doc.id, "signature_sender", params.signature_sender)
  }

  return doc
}

export async function getDocuments(status?: DocStatus): Promise<Document[]> {
  if (status) {
    return (await sql`SELECT * FROM documents WHERE status = ${status} ORDER BY created_at DESC`) as Document[]
  }
  return (await sql`SELECT * FROM documents ORDER BY created_at DESC`) as Document[]
}

export async function getDocument(id: number) {
  const docs = await sql`SELECT * FROM documents WHERE id = ${id}`
  if (docs.length === 0) return null
  const attachments = await sql`SELECT * FROM attachments WHERE document_id = ${id} ORDER BY created_at ASC`
  return { ...docs[0], attachments } as Document & { attachments: Attachment[] }
}

export async function confirmDocument(
  id: number,
  params: { photo_recipient?: string; signature_recipient?: string }
) {
  await sql`UPDATE documents SET status = 'confirmed', updated_at = NOW() WHERE id = ${id}`
  if (params.photo_recipient) {
    await addAttachment(id, "photo_recipient", params.photo_recipient)
  }
  if (params.signature_recipient) {
    await addAttachment(id, "signature_recipient", params.signature_recipient)
  }
  return getDocument(id)
}

async function addAttachment(documentId: number, kind: AttachmentKind, data: string) {
  if (!data.startsWith("data:image/")) {
    throw new Error("Invalid attachment format")
  }
  const rawSize = Math.ceil(((data.length * 3) / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0))
  if (rawSize > 5 * 1024 * 1024) {
    throw new Error("Attachment too large")
  }
  await sql`
    INSERT INTO attachments (document_id, kind, data)
    VALUES (${documentId}, ${kind}, ${data})
  `
}

export async function deleteDocument(id: number) {
  await sql`DELETE FROM attachments WHERE document_id = ${id}`
  await sql`DELETE FROM documents WHERE id = ${id}`
}

export async function deleteDocuments(ids: number[]) {
  if (ids.length === 0) return
  await sql`DELETE FROM attachments WHERE document_id = ANY(${ids})`
  await sql`DELETE FROM documents WHERE id = ANY(${ids})`
}

export { sql }
