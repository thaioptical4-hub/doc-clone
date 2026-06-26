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
      <div className="card" style={{ textAlign: "center", marginTop: 24 }}>
        <h2>ส่งเอกสารแล้ว</h2>
        <p style={{ color: "#34c759", marginTop: 8 }}>ผู้รับสามารถยืนยันการรับได้ที่แท็บรับเอกสาร</p>
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
