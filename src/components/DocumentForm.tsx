"use client"

import { useState, useRef } from "react"
import CameraCapture from "./CameraCapture"
import SignaturePad from "./SignaturePad"

const DOC_TYPE_OPTIONS = ["เอกสารภายใน", "จดหมาย", "พัสดุ", "อื่นๆ"]
const OTHER_OPTION = "อื่นๆ"

interface DocumentFormProps {
  onSuccess: () => void
}

export default function DocumentForm({ onSuccess }: DocumentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [photo, setPhoto] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [docType, setDocType] = useState(DOC_TYPE_OPTIONS[0])
  const [customDocType, setCustomDocType] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const form = new FormData(e.currentTarget as HTMLFormElement)
    const body: Record<string, unknown> = {
      doc_type: docType === OTHER_OPTION ? customDocType : docType,
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
      setDocType(DOC_TYPE_OPTIONS[0])
      setCustomDocType("")
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
        <select id="doc_type" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {docType === OTHER_OPTION && (
          <input
            type="text"
            required
            placeholder="ระบุประเภทเอกสาร"
            value={customDocType}
            onChange={(e) => setCustomDocType(e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description">คำอธิบาย (ไม่บังคับ)</label>
        <textarea id="description" name="description" rows={3} placeholder="คำอธิบายสั้นๆ ของเอกสาร..." />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="sender_name">ชื่อผู้ส่ง</label>
          <input id="sender_name" name="sender_name" type="text" required placeholder="เช่น สมชาย ใจดี" />
        </div>

        <div className="form-group">
          <label htmlFor="recipient_name">ชื่อผู้รับ</label>
          <input id="recipient_name" name="recipient_name" type="text" required placeholder="เช่น สมหญิง รักดี" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>รูปภาพ (ไม่บังคับ)</label>
          <CameraCapture value={photo} onChange={setPhoto} />
        </div>

        <div className="form-group">
          <label>ลายเซ็น (ไม่บังคับ)</label>
          <SignaturePad value={signature} onChange={setSignature} />
        </div>
      </div>

      {error && <p style={{ color: "#ff3b30", marginBottom: 16 }}>{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "กำลังส่ง..." : "ส่งเอกสาร"}
      </button>
    </form>
  )
}
