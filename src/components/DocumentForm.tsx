"use client"

import { useState, useRef } from "react"
import CameraCapture from "./CameraCapture"
import SignaturePad from "./SignaturePad"

interface DocumentFormProps {
  onSuccess: () => void
}

export default function DocumentForm({ onSuccess }: DocumentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [photo, setPhoto] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const form = new FormData(e.currentTarget as HTMLFormElement)
    const body: Record<string, unknown> = {
      doc_type: form.get("doc_type"),
      sender_name: form.get("sender_name"),
      recipient_name: form.get("recipient_name"),
      description: form.get("description") || undefined,
    }

    if (photo) body.photo_sender = photo
    if (signature) body.signature_sender = signature

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      formRef.current?.reset()
      setPhoto(null)
      setSignature(null)
      onSuccess()
    } else {
      setError("ส่งเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง")
    }
    setSubmitting(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card">
      <div className="form-group">
        <label htmlFor="doc_type">ประเภทเอกสาร</label>
        <input id="doc_type" name="doc_type" type="text" required placeholder="เช่น ใบแจ้งหนี้ สัญญา รายงาน..." />
      </div>

      <div className="form-group">
        <label htmlFor="description">คำอธิบาย (ไม่บังคับ)</label>
        <textarea id="description" name="description" rows={3} placeholder="คำอธิบายสั้นๆ ของเอกสาร..." />
      </div>

      <div className="form-group">
        <label htmlFor="sender_name">ชื่อผู้ส่ง</label>
        <input id="sender_name" name="sender_name" type="text" required placeholder="เช่น สมชาย ใจดี" />
      </div>

      <div className="form-group">
        <label htmlFor="recipient_name">ชื่อผู้รับ</label>
        <input id="recipient_name" name="recipient_name" type="text" required placeholder="เช่น สมหญิง รักดี" />
      </div>

      <div className="form-group">
        <label>รูปภาพ (ไม่บังคับ)</label>
        <CameraCapture value={photo} onChange={setPhoto} />
      </div>

      <div className="form-group">
        <label>ลายเซ็น (ไม่บังคับ)</label>
        <SignaturePad value={signature} onChange={setSignature} />
      </div>

      {error && <p style={{ color: "#ff3b30", marginBottom: 16 }}>{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "กำลังส่ง..." : "ส่งเอกสาร"}
      </button>
    </form>
  )
}
