import Link from "next/link"
import type { Document } from "@/lib/types"

interface DocumentListProps {
  documents: Document[]
}

function statusBadge(status: string) {
  const cls = status === "sent" ? "badge badge-sent" : "badge badge-confirmed"
  return <span className={cls}>{status}</span>
}

export default function DocumentList({ documents }: DocumentListProps) {
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
            <div style={{ textAlign: "right" }}>
              {statusBadge(doc.status)}
              <div style={{ fontSize: "0.75rem", color: "#aaa", marginTop: 4 }}>
                {new Date(doc.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
