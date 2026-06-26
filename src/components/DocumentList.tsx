import { useState } from "react"
import Link from "next/link"
import type { Document } from "@/lib/types"

interface DocumentListProps {
  documents: Document[]
  onDelete?: (id: number) => void
}

const STATUS_LABEL: Record<string, string> = {
  sent: "รอรับ",
  confirmed: "รับแล้ว",
}

function statusBadge(status: string) {
  const cls = status === "sent" ? "badge badge-sent" : "badge badge-confirmed"
  return <span className={cls}>{STATUS_LABEL[status] || status}</span>
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", color: "#888" }}>
        <p>ยังไม่มีเอกสาร</p>
        <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
          เอกสารที่สร้างในแท็บส่งจะปรากฏที่นี่
        </p>
      </div>
    )
  }

  const [deleting, setDeleting] = useState<number | null>(null)

  async function handleDelete(id: number) {
    if (deleting) return
    if (!window.confirm("ลบเอกสารนี้?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (res.ok) onDelete?.(id)
    } catch {
      // Silently fail — list stays unchanged
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      {documents.map((doc) => (
        <div key={doc.id} className="doc-list-row">
          <Link
            href={`/receive/${doc.id}`}
            style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}
          >
            <div className="doc-list-item">
              <div>
                <div style={{ fontWeight: 600 }}>{doc.doc_type}</div>
                <div style={{ fontSize: "0.85rem", color: "#888", marginTop: 2 }}>
                  {doc.sender_name} &rarr; {doc.recipient_name}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {statusBadge(doc.status)}
                <div style={{ fontSize: "0.75rem", color: "#aaa", marginTop: 4 }}>
                  {new Date(doc.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Link>
          {onDelete && (
            <button
              onClick={() => handleDelete(doc.id)}
              disabled={deleting === doc.id}
              style={{
                background: "none",
                border: "none",
                color: deleting === doc.id ? "#ccc" : "#ff3b30",
                fontSize: "1.4rem",
                cursor: "pointer",
                padding: "12px 16px",
                lineHeight: 1,
              }}
              title="ลบ"
            >
              &times;
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
