import { OAuth2Client } from "google-auth-library"

let client: OAuth2Client | null = null

function getClient(): OAuth2Client | null {
  if (client) return client
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null
  client = new OAuth2Client(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

/** Splits a `data:image/...;base64,...` URL into its raw bytes, mime type, and file extension. */
export function parseImageDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } {
  const match = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl)
  if (!match) throw new Error("Invalid image data URL")
  const mimeType = match[1].toLowerCase()
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1]
  return { buffer: Buffer.from(match[3], "base64"), mimeType, extension }
}

/** Uploads a file to the configured Google Drive account. Returns the Drive file id, or null if Drive isn't configured. */
export async function uploadFileToDrive(buffer: Buffer, filename: string, mimeType: string): Promise<string | null> {
  const oauth2Client = getClient()
  if (!oauth2Client) return null

  const { token } = await oauth2Client.getAccessToken()
  if (!token) throw new Error("Failed to obtain Google access token")

  const metadata: Record<string, unknown> = {
    name: filename,
    mimeType,
  }
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (folderId) metadata.parents = [folderId]

  const boundary = `docdelivery-${Math.random().toString(36).slice(2)}`
  const metadataPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n`
  const filePartHeader = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  const closing = `\r\n--${boundary}--`

  const body = Buffer.concat([
    Buffer.from(metadataPart, "utf-8"),
    Buffer.from(filePartHeader, "utf-8"),
    buffer,
    Buffer.from(closing, "utf-8"),
  ])

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Drive upload failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { id: string }
  return json.id
}
