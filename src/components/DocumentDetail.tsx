"use client"

import { useState, useRef } from "react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import CameraCapture from "./CameraCapture"
import SignaturePad from "./SignaturePad"
import type { DocumentWithAttachments } from "@/lib/types"

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

interface DocumentDetailProps {
  document: DocumentWithAttachments
  onConfirm: (photo?: string, signature?: string) => Promise<void>
  onDelete?: () => void
}

export default function DocumentDetail({ document, onConfirm, onDelete }: DocumentDetailProps) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [exporting, setExporting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const senderPhoto = document.attachments.find((a) => a.kind === "photo_sender")
  const senderSig = document.attachments.find((a) => a.kind === "signature_sender")
  const recipientPhoto = document.attachments.find((a) => a.kind === "photo_recipient")
  const recipientSig = document.attachments.find((a) => a.kind === "signature_recipient")
  const isConfirmed = document.status === "confirmed"

  async function handleConfirm() {
    setConfirming(true)
    await onConfirm(photo || undefined, signature || undefined)
    setConfirming(false)
  }

  async function handleExport() {
    if (!printRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
      })
      const imgData = canvas.toDataURL("image/jpeg", 0.85)
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const maxW = pageWidth - margin * 2
      const maxH = pageHeight - margin * 2
      const scale = Math.min(maxW / canvas.width, maxH / canvas.height)
      const finalW = canvas.width * scale
      const finalH = canvas.height * scale
      const x = (pageWidth - finalW) / 2
      const y = (pageHeight - finalH) / 2

      pdf.addImage(imgData, "JPEG", x, y, finalW, finalH)

      const blob = pdf.output("blob")
      const file = new File([blob], `doc-${document.id}-${document.doc_type.replace(/\s+/g, "-")}.pdf`, {
        type: "application/pdf",
      })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: document.doc_type })
      } else {
        const url = URL.createObjectURL(blob)
        const a = window.document.createElement("a")
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn-print" onClick={handleExport} disabled={exporting}>
          {exporting ? "กำลังสร้าง PDF..." : "ส่งออก PDF"}
        </button>
        {onDelete && (
          <button
            className="btn-danger"
            onClick={async () => {
              if (window.confirm("ลบเอกสารนี้?")) {
                await fetch(`/api/documents/${document.id}`, { method: "DELETE" })
                onDelete()
              }
            }}
          >
            ลบ
          </button>
        )}
      </div>

      <div className="card" ref={printRef}>
        <h3 style={{ marginBottom: 8 }}>{document.doc_type}</h3>

        <div style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>ผู้ส่ง</label>
            <p>{document.sender_name}</p>
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>ผู้รับ</label>
            <p>{document.recipient_name}</p>
          </div>
          {document.description && (
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label>คำอธิบาย</label>
              <p style={{ whiteSpace: "pre-wrap", color: "#555" }}>{document.description}</p>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>วันที่ส่ง</label>
            <p>{formatDate(document.created_at)}</p>
          </div>
          {isConfirmed && (
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label>วันที่รับ</label>
              <p>{formatDate(document.updated_at)}</p>
            </div>
          )}
          <div className="form-group">
            <label>สถานะ</label>
            <span className={isConfirmed ? "badge badge-confirmed" : "badge badge-sent"}>
              {isConfirmed ? "รับแล้ว" : "รอรับ"}
            </span>
          </div>
        </div>

        {senderPhoto && (
          <div className="form-group">
            <label>รูปผู้ส่ง</label>
            <div className="camera-area">
              <img src={senderPhoto.data} alt="Sender" />
            </div>
          </div>
        )}

        {senderSig && (
          <div className="form-group">
            <label>ลายเซ็นผู้ส่ง</label>
            <div className="signature-area" style={{ border: "1px solid #eee" }}>
              <img src={senderSig.data} alt="Sender signature" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
        )}

        {isConfirmed && (
          <>
            <hr style={{ margin: "20px 0", border: "none", borderTop: "2px solid #34c759" }} />

            {recipientPhoto && (
              <div className="form-group">
                <label>รูปผู้รับ</label>
                <div className="camera-area">
                  <img src={recipientPhoto.data} alt="Recipient" />
                </div>
              </div>
            )}

            {recipientSig && (
              <div className="form-group">
                <label>ลายเซ็นผู้รับ</label>
                <div className="signature-area" style={{ border: "1px solid #eee" }}>
                  <img src={recipientSig.data} alt="Recipient signature" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
            )}
          </>
        )}

        {!isConfirmed && (
          <>
            <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #eee" }} />

            <div className="form-group">
              <label>รูปภาพ (ไม่บังคับ)</label>
              <CameraCapture value={photo} onChange={setPhoto} />
            </div>

            <div className="form-group">
              <label>ลายเซ็น (ไม่บังคับ)</label>
              <SignaturePad value={signature} onChange={setSignature} />
            </div>

            <button className="btn-success" onClick={handleConfirm} disabled={confirming}>
              {confirming ? "กำลังยืนยัน..." : "ยืนยันการรับ"}
            </button>
          </>
        )}
      </div>
    </>
  )
}
