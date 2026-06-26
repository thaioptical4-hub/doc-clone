"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import DocumentDetail from "@/components/DocumentDetail"
import type { DocumentWithAttachments } from "@/lib/types"

export default function ReceiveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [doc, setDoc] = useState<DocumentWithAttachments | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDoc = async () => {
    const res = await fetch(`/api/documents/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setDoc(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDoc()
  }, [params.id])

  const handleConfirm = async (photo?: string, signature?: string) => {
    const res = await fetch(`/api/documents/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photo_recipient: photo || undefined,
        signature_recipient: signature || undefined,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setDoc(updated)
    }
  }

  if (loading) return <p style={{ marginTop: 24 }}>Loading...</p>
  if (!doc) return <p style={{ marginTop: 24 }}>Document not found</p>

  return (
    <div style={{ marginTop: 24 }}>
      <button className="back-button" onClick={() => router.push("/?tab=receive")} style={{ background: "none", color: "#007aff", padding: "8px 0", marginBottom: 16 }}>
        &larr; Back
      </button>
      <DocumentDetail document={doc} onConfirm={handleConfirm} />
    </div>
  )
}
