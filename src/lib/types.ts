export type DocStatus = "sent" | "confirmed"

export type AttachmentKind =
  | "photo_sender"
  | "signature_sender"
  | "photo_recipient"
  | "signature_recipient"

export interface Document {
  id: number
  doc_type: string
  sender_name: string
  recipient_name: string
  description: string | null
  status: DocStatus
  created_at: string
  updated_at: string
  sheet_row: number | null
}

export interface Attachment {
  id: number
  document_id: number
  kind: AttachmentKind
  data: string
  created_at: string
}

export interface DocumentWithAttachments extends Document {
  attachments: Attachment[]
}
