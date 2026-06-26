"use client"

import { useState, useEffect } from "react"
import DocumentList from "@/components/DocumentList"
import type { Document } from "@/lib/types"

export default function ReceivePage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = async () => {
    const res = await fetch("/api/documents")
    if (res.ok) {
      const data = await res.json()
      setDocs(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDocs()
    const interval = setInterval(() => fetchDocs(), 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <p style={{ marginTop: 24 }}>กำลังโหลด...</p>

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ marginBottom: 16 }}>เอกสารที่รอรับ</h2>
      <DocumentList documents={docs} onRefresh={fetchDocs} />
    </div>
  )
}
