import { neon } from "@neondatabase/serverless"
import type { Document, Attachment, DocStatus, AttachmentKind, AttachmentRef, HistoryRow } from "./types"

const sql = neon(process.env.POSTGRES_URL!)

/**
 * Applies the additive v2 columns once per server instance, so deploying this version
 * never breaks inserts on a database that hasn't had db/schema.sql re-run yet.
 */
let schemaReady: Promise<void> | null = null
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS sender_department VARCHAR(100)`
      await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_department VARCHAR(100)`
      await sql`CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)`
    })().catch((error) => {
      schemaReady = null
      throw error
    })
  }
  return schemaReady
}

export async function createDocument(params: {
  doc_type: string
  sender_name: string
  recipient_name: string
  sender_department?: string | null
  recipient_department?: string | null
  description?: string
  photos_sender?: string[]
  signature_sender?: string
}): Promise<Document> {
  await ensureSchema()
  const rows = await sql`
    INSERT INTO documents (doc_type, sender_name, recipient_name, sender_department, recipient_department, description, status)
    VALUES (${params.doc_type}, ${params.sender_name}, ${params.recipient_name}, ${params.sender_department || null}, ${params.recipient_department || null}, ${params.description || null}, 'sent')
    RETURNING *
  `
  const doc = rows[0] as Document

  for (const photo of params.photos_sender || []) {
    await addAttachment(doc.id, "photo_sender", photo)
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

export async function setSheetRow(id: number, row: number) {
  await sql`UPDATE documents SET sheet_row = ${row} WHERE id = ${id}`
}

/** Documents created at or after `since`, newest first, without attachment payloads. */
export async function getDocumentsSince(since: Date): Promise<Document[]> {
  await ensureSchema()
  return (await sql`
    SELECT * FROM documents WHERE created_at >= ${since.toISOString()} ORDER BY created_at DESC
  `) as Document[]
}

/** Every document still waiting to be received, oldest first. */
export async function getPendingDocuments(): Promise<Document[]> {
  await ensureSchema()
  return (await sql`SELECT * FROM documents WHERE status = 'sent' ORDER BY created_at ASC`) as Document[]
}

export async function getHistory(filter: {
  from: Date
  to: Date
  department?: string | null
  status?: DocStatus | null
  q?: string | null
}): Promise<HistoryRow[]> {
  await ensureSchema()
  const dept = filter.department || null
  const status = filter.status || null
  const q = filter.q ? `%${filter.q}%` : null
  // "DOC-000123", "#123" and "123" all find document 123
  const idMatch = filter.q ? /^(?:doc-?|#)?0*(\d{1,9})$/i.exec(filter.q.trim()) : null
  const idQuery = idMatch ? Number(idMatch[1]) : -1
  const docs = (await sql`
    SELECT * FROM documents
    WHERE created_at >= ${filter.from.toISOString()}
      AND created_at < ${filter.to.toISOString()}
      AND (${dept}::text IS NULL OR sender_department = ${dept} OR recipient_department = ${dept})
      AND (${status}::text IS NULL OR status = ${status})
      AND (${q}::text IS NULL
        OR doc_type ILIKE ${q} OR sender_name ILIKE ${q} OR recipient_name ILIKE ${q}
        OR COALESCE(description, '') ILIKE ${q} OR id = ${idQuery})
    ORDER BY created_at DESC
    LIMIT 2000
  `) as Document[]
  if (docs.length === 0) return []

  const ids = docs.map((d) => d.id)
  const refs = (await sql`
    SELECT id, document_id, kind FROM attachments WHERE document_id = ANY(${ids}) ORDER BY created_at ASC
  `) as (AttachmentRef & { document_id: number })[]

  const byDoc = new Map<number, AttachmentRef[]>()
  for (const r of refs) {
    if (!byDoc.has(r.document_id)) byDoc.set(r.document_id, [])
    byDoc.get(r.document_id)!.push({ id: r.id, kind: r.kind })
  }
  return docs.map((d) => ({ ...d, attachments: byDoc.get(d.id) || [] }))
}

export async function getAttachment(id: number): Promise<Pick<Attachment, "id" | "kind" | "data" | "document_id"> | null> {
  const rows = await sql`SELECT id, document_id, kind, data FROM attachments WHERE id = ${id}`
  return rows.length ? (rows[0] as Pick<Attachment, "id" | "kind" | "data" | "document_id">) : null
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
