import { getAttachment } from "@/lib/db"
import { parseImageDataUrl } from "@/lib/googleDrive"

/**
 * Serves one stored photo/signature as a real image, so lists can show thumbnails
 * without pulling every base64 payload into the page. Attachments never change, so they cache well.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const attachment = await getAttachment(Number(id))
    if (!attachment) return new Response("Not found", { status: 404 })
    const { buffer, mimeType } = parseImageDataUrl(attachment.data)
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=604800, immutable",
      },
    })
  } catch (error) {
    console.error("GET /api/attachments/[id] error:", error)
    return new Response("Failed to load attachment", { status: 500 })
  }
}
