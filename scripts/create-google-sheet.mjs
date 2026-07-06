// One-time helper: creates the Google Sheet used to log document send/receive activity.
//
// Run after get-google-refresh-token.mjs (reuses the same OAuth credentials):
//   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy GOOGLE_REFRESH_TOKEN=zzz node scripts/create-google-sheet.mjs
//
// Prints GOOGLE_SHEET_ID — add it to your .env.local / Vercel env vars.

import { OAuth2Client } from "google-auth-library"

const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

if (!clientId || !clientSecret || !refreshToken) {
  console.error("Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN before running this script.")
  process.exit(1)
}

const client = new OAuth2Client(clientId, clientSecret)
client.setCredentials({ refresh_token: refreshToken })

const HEADERS = [
  "ID",
  "ประเภทเอกสาร",
  "ผู้ส่ง",
  "ผู้รับ",
  "คำอธิบาย",
  "วันที่ส่ง",
  "สถานะ",
  "วันที่รับ",
  "ลิงก์รูปผู้ส่ง",
  "ลิงก์ลายเซ็นผู้ส่ง",
  "ลิงก์รูปผู้รับ",
  "ลิงก์ลายเซ็นผู้รับ",
]

async function main() {
  const { token } = await client.getAccessToken()

  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: { title: "Doc Delivery Log" },
      sheets: [{ properties: { title: "Documents" } }],
    }),
  })
  if (!createRes.ok) throw new Error(`Sheet creation failed (${createRes.status}): ${await createRes.text()}`)
  const { spreadsheetId } = await createRes.json()

  const headerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Documents!A1:L1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [HEADERS] }),
    }
  )
  if (!headerRes.ok) throw new Error(`Header row failed (${headerRes.status}): ${await headerRes.text()}`)

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (folderId) {
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=parents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const { parents } = await fileRes.json()
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&removeParents=${(parents || []).join(",")}`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
    )
  }

  console.log("Created! Add this to your .env.local / Vercel env vars:\n")
  console.log(`GOOGLE_SHEET_ID=${spreadsheetId}`)
  console.log(`\nSheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
