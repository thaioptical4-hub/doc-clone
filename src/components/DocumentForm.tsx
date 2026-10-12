"use client"

import { useState, useRef } from "react"
import MultiCameraCapture from "./MultiCameraCapture"
import { DEPARTMENTS } from "@/lib/departments"

const DOC_TYPE_OPTIONS = ["เอกสารภายใน", "จดหมาย", "พัสดุ", "อื่นๆ"]
const OTHER_OPTION = "อื่นๆ"

interface DocumentFormProps {
  onSuccess: () => void
}

export default function DocumentForm({ onSuccess }: DocumentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [docType, setDocType] = useState(DOC_TYPE_OPTIONS[0])
  const [customDocType, setCustomDocType] = useState("")
  const [senderDept, setSenderDept] = useState("")
  const [recipientDept, setRecipientDept] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  const missingPhoto = photos.length === 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (missingPhoto) {
      setError("กรุณาถ่ายรูปเอกสารก่อนส่งอย่างน้อย 1 รูป")
      return
    }
    setSubmitting(true)
    setError("")

    const form = new FormData(e.currentTarget as HTMLFormElement)
    const body: Record<string, unknown> = {
      doc_type: docType === OTHER_OPTION ? customDocType : docType,
      sender_name: form.get("sender_name"),
      recipient_name: form.get("recipient_name"),
      sender_department: senderDept,
      recipient_department: recipientDept,
      description: form.get("description") || undefined,
      photos_sender: photos,
    }

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      formRef.current?.reset()
      setPhotos([])
      setDocType(DOC_TYPE_OPTIONS[0])
      setCustomDocType("")
      setSenderDept("")
      setRecipientDept("")
      onSuccess()
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error || "ส่งเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง")
    }
    setSubmitting(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card form-card">
      <div className="step-title"><span className="step-num">1</span> ข้อมูลเอกสาร</div>
      <div className="form-row">
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
          <input id="description" name="description" type="text" placeholder="เช่น ใบแจ้งหนี้ 3 แผ่น" />
        </div>
      </div>

      <div className="step-title"><span className="step-num">2</span> จากใคร ถึงใคร</div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="sender_department">หน่วยงานผู้ส่ง</label>
          <select id="sender_department" required value={senderDept} onChange={(e) => setSenderDept(e.target.value)}>
            <option value="" disabled>เลือกหน่วยงาน</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="sender_name">ชื่อผู้ส่ง</label>
          <input id="sender_name" name="sender_name" type="text" required placeholder="เช่น สมชาย ใจดี" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="recipient_department">หน่วยงานผู้รับ</label>
          <select id="recipient_department" required value={recipientDept} onChange={(e) => setRecipientDept(e.target.value)}>
            <option value="" disabled>เลือกหน่วยงาน</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="recipient_name">ชื่อผู้รับ</label>
          <input id="recipient_name" name="recipient_name" type="text" required placeholder="เช่น สมหญิง รักดี" />
        </div>
      </div>

      <div className="step-title"><span className="step-num">3</span> ถ่ายรูปเอกสารก่อนส่ง</div>
      <div className="form-group">
        <label>รูปก่อนส่ง (บังคับอย่างน้อย 1 รูป, สูงสุด 5 รูป)</label>
        <MultiCameraCapture value={photos} onChange={setPhotos} />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button type="submit" className="btn-primary btn-xl" disabled={submitting || missingPhoto}>
        {submitting ? "กำลังส่ง..." : missingPhoto ? "ถ่ายรูปเอกสารก่อนส่ง" : "ส่งเอกสาร"}
      </button>
    </form>
  )
}
