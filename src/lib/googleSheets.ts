import { getGoogleAccessToken } from "./googleAuth"

const SHEET_NAME = "Documents"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
}

/** Appends a new row for a just-sent document. Returns the 1-based row number, or null if Sheets isn't configured. */
export async function appendDocumentRow(doc: {
  id: number
  doc_type: string
  sender_name: string
  recipient_name: string
  description: string | null
  created_at: string
}): Promise<number | null> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  const token = await getGoogleAccessToken()
  if (!spreadsheetId || !token) return null

  // Columns: A id, B doc_type, C sender, D recipient, E description, F sent_at, G status, H confirmed_at, I-L Drive links
  const row = [
    doc.id,
    doc.doc_type,
    doc.sender_name,
    doc.recipient_name,
    doc.description ?? "",
    formatDate(doc.created_at),
    "sent",
    "",
    "",
    "",
    "",
    "",
  ]

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  )
  if (!res.ok) throw new Error(`Sheets append failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as { updates: { updatedRange: string } }
  const match = /![A-Z]+(\d+):/.exec(json.updates.updatedRange)
  return match ? Number(match[1]) : null
}

/** Fills in the recipient/confirm columns and Drive links for an existing row. */
export async function updateDocumentRow(
  rowNumber: number,
  fields: {
    updated_at: string
    links: {
      senderPhoto?: string
      senderSignature?: string
      recipientPhoto?: string
      recipientSignature?: string
    }
  }
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  const token = await getGoogleAccessToken()
  if (!spreadsheetId || !token) return

  const values = [
    "confirmed",
    formatDate(fields.updated_at),
    fields.links.senderPhoto ?? "",
    fields.links.senderSignature ?? "",
    fields.links.recipientPhoto ?? "",
    fields.links.recipientSignature ?? "",
  ]

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!G${rowNumber}:L${rowNumber}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    }
  )
  if (!res.ok) throw new Error(`Sheets update failed (${res.status}): ${await res.text()}`)
}
