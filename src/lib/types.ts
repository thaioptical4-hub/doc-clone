export type DocType = "invoice" | "packing_slip" | "contract" | "report" | "other"

export type DocStatus = "sent" | "confirmed"

export type AttachmentKind =
  | "photo_sender"
  | "signature_sender"
  | "photo_recipient"
  | "signature_recipient"

export interface Document {
  id: number
  doc_type: DocType
  sender_name: string
  recipient_name: string
  status: DocStatus
  created_at: string
  updated_at: string
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
