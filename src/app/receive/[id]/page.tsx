"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import DocumentDetail from "@/components/DocumentDetail"
import { AppNav } from "@/components/AppNav"
import { useIsAdmin } from "@/components/Providers"
import type { DocumentWithAttachments } from "@/lib/types"

export default function ReceiveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [doc, setDoc] = useState<DocumentWithAttachments | null>(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = useIsAdmin()

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
      return
    }
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || "ยืนยันไม่สำเร็จ กรุณาลองอีกครั้ง")
  }

  if (loading) return <><AppNav active="receive" /><p className="container">กำลังโหลด...</p></>
  if (!doc) return <><AppNav active="receive" /><p className="container">ไม่พบเอกสาร</p></>

  return (
    <>
    <AppNav active="receive" />
    <div className="container" style={{ marginTop: 8 }}>
      <button className="back-button" onClick={() => router.push("/?tab=receive")} style={{ marginBottom: 16 }}>
        &larr; กลับ
      </button>
      <DocumentDetail
        document={doc}
        onConfirm={handleConfirm}
        onDelete={isAdmin ? () => router.push("/?tab=receive") : undefined}
      />
    </div>
    </>
  )
}
