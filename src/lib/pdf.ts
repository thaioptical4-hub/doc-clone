import { jsPDF } from "jspdf"
import type { DocumentWithAttachments } from "./types"

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function imageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const match = /^data:image\/(png|jpe?g|webp)/i.exec(dataUrl)
  const ext = match?.[1]?.toLowerCase()
  if (ext === "png") return "PNG"
  if (ext === "webp") return "WEBP"
  return "JPEG"
}

export function generateDocumentPdf(doc: DocumentWithAttachments): Buffer {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - margin) {
      pdf.addPage()
      y = margin
    }
  }

  function addField(label: string, value: string) {
    ensureSpace(14)
    pdf.setFontSize(10)
    pdf.setTextColor(120)
    pdf.text(label, margin, y)
    y += 5
    pdf.setFontSize(12)
    pdf.setTextColor(20)
    const lines = pdf.splitTextToSize(value, contentWidth)
    pdf.text(lines, margin, y)
    y += lines.length * 6 + 4
  }

  function addImageBlock(label: string, dataUrl: string) {
    const props = pdf.getImageProperties(dataUrl)
    const maxW = contentWidth
    const maxH = 70
    const scale = Math.min(maxW / props.width, maxH / props.height)
    const w = props.width * scale
    const h = props.height * scale
    ensureSpace(h + 12)
    pdf.setFontSize(10)
    pdf.setTextColor(120)
    pdf.text(label, margin, y)
    y += 5
    pdf.addImage(dataUrl, imageFormat(dataUrl), margin, y, w, h)
    y += h + 6
  }

  pdf.setFontSize(18)
  pdf.setTextColor(20)
  pdf.text(doc.doc_type, margin, y)
  y += 10

  addField("ผู้ส่ง", doc.sender_name)
  addField("ผู้รับ", doc.recipient_name)
  if (doc.description) addField("คำอธิบาย", doc.description)
  addField("วันที่ส่ง", formatDate(doc.created_at))
  if (doc.status === "confirmed") addField("วันที่รับ", formatDate(doc.updated_at))
  addField("สถานะ", doc.status === "confirmed" ? "รับแล้ว" : "รอรับ")

  const senderPhoto = doc.attachments.find((a) => a.kind === "photo_sender")
  const senderSig = doc.attachments.find((a) => a.kind === "signature_sender")
  const recipientPhoto = doc.attachments.find((a) => a.kind === "photo_recipient")
  const recipientSig = doc.attachments.find((a) => a.kind === "signature_recipient")

  if (senderPhoto) addImageBlock("รูปผู้ส่ง", senderPhoto.data)
  if (senderSig) addImageBlock("ลายเซ็นผู้ส่ง", senderSig.data)
  if (recipientPhoto) addImageBlock("รูปผู้รับ", recipientPhoto.data)
  if (recipientSig) addImageBlock("ลายเซ็นผู้รับ", recipientSig.data)

  return Buffer.from(pdf.output("arraybuffer"))
}
