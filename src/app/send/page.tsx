"use client"

import { useState } from "react"
import DocumentForm from "@/components/DocumentForm"

export default function SendPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSuccess = () => {
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  if (submitted) {
    return (
      <div className="card success-card" style={{ marginTop: 24 }}>
        <div className="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2>ส่งเอกสารแล้ว</h2>
        <p className="muted" style={{ marginTop: 8 }}>ผู้รับยืนยันการรับได้ที่เมนู "รับเอกสาร"</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setSubmitted(false)}>
          ส่งอีกฉบับ
        </button>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ marginBottom: 16 }}>ส่งเอกสาร</h2>
      <DocumentForm onSuccess={handleSuccess} />
    </div>
  )
}
