import Link from "next/link"
import type { Document } from "@/lib/types"

interface DocumentListProps {
  documents: Document[]
  onDelete?: (id: number) => void
}

function statusBadge(status: string) {
  const cls = status === "sent" ? "badge badge-sent" : "badge badge-confirmed"
  return <span className={cls}>{status}</span>
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", color: "#888" }}>
        <p>No documents yet.</p>
        <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
          Documents created on the Send tab will appear here.
        </p>
      </div>
    )
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm("Delete this document?")) return
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
    if (res.ok) onDelete?.(id)
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      {documents.map((doc) => (
        <Link
          key={doc.id}
          href={`/receive/${doc.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="doc-list-item">
            <div>
              <div style={{ fontWeight: 600 }}>{doc.doc_type}</div>
              <div style={{ fontSize: "0.85rem", color: "#888", marginTop: 2 }}>
                {doc.sender_name} &rarr; {doc.recipient_name}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "right" }}>
                {statusBadge(doc.status)}
                <div style={{ fontSize: "0.75rem", color: "#aaa", marginTop: 4 }}>
                  {new Date(doc.created_at).toLocaleDateString()}
                </div>
              </div>
              {onDelete && (
                <button
                  onClick={(e) => handleDelete(e, doc.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ff3b30",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                  title="Delete"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
