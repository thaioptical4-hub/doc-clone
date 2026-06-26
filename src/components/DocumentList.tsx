import { useState, useRef, useMemo } from "react"
import Link from "next/link"
import { jsPDF } from "jspdf"
import type { Document } from "@/lib/types"

interface DocumentListProps {
  documents: Document[]
  onRefresh: () => void
}

const STATUS_LABEL: Record<string, string> = {
  sent: "รอรับ",
  confirmed: "รับแล้ว",
}

function statusBadge(status: string) {
  const cls = status === "sent" ? "badge badge-sent" : "badge badge-confirmed"
  return <span className={cls}>{STATUS_LABEL[status] || status}</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function dateKey(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function dateGroups(docs: Document[]): [string, Document[]][] {
  const map = new Map<string, Document[]>()
  for (const doc of docs) {
    const key = dateKey(doc.created_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(doc)
  }
  return Array.from(map.entries()).sort((a, b) => {
    const aTime = new Date(a[1][0].created_at).getTime()
    const bTime = new Date(b[1][0].created_at).getTime()
    return bTime - aTime
  })
}

export default function DocumentList({ documents, onRefresh }: DocumentListProps) {
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmBatch, setConfirmBatch] = useState(false)
  const [confirmSingle, setConfirmSingle] = useState<number | null>(null)
  const deletingRef = useRef(false)
  const groups = useMemo(() => dateGroups(documents), [documents])

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSingleDelete(id: number) {
    if (deletingRef.current) return
    setConfirmSingle(id)
  }

  function confirmSingleDelete() {
    if (confirmSingle === null) return
    const id = confirmSingle
    setConfirmSingle(null)
    deletingRef.current = true
    setDeleting(true)
    fetch(`/api/documents/${id}`, { method: "DELETE" })
      .then((res) => {
        if (res.ok) onRefresh()
      })
      .catch(() => {})
      .finally(() => {
        deletingRef.current = false
        setDeleting(false)
      })
  }

  function cancelSingleDelete() {
    setConfirmSingle(null)
  }

  function handleBatchDelete() {
    if (deletingRef.current || selectedIds.size === 0) return
    setConfirmBatch(true)
  }

  function confirmBatchDelete() {
    const ids = Array.from(selectedIds)
    setConfirmBatch(false)
    setSelectMode(false)
    setSelectedIds(new Set())
    deletingRef.current = true
    setDeleting(true)
    fetch("/api/documents/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((res) => {
        if (res.ok) onRefresh()
      })
      .catch(() => {})
      .finally(() => {
        deletingRef.current = false
        setDeleting(false)
      })
  }

  function cancelBatchDelete() {
    setConfirmBatch(false)
  }

  function enterSelectMode() {
    setSelectMode(true)
    setSelectedIds(new Set())
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function isAllSelected() {
    return documents.every((d) => selectedIds.has(d.id))
  }

  function toggleSelectAll() {
    if (isAllSelected()) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)))
    }
  }

  function handleExportAll() {
    if (exporting) return
    setExporting(true)
    try {
      const pdf = new jsPDF()
      documents.forEach((doc, idx) => {
        if (idx > 0) pdf.addPage()
        let y = 20
        pdf.setFontSize(16)
        pdf.text(doc.doc_type, 10, y)
        y += 12
        pdf.setFontSize(11)
        pdf.text(`ผู้ส่ง: ${doc.sender_name}`, 10, y); y += 8
        pdf.text(`ผู้รับ: ${doc.recipient_name}`, 10, y); y += 8
        if (doc.description) {
          const lines = pdf.splitTextToSize(doc.description, 180)
          pdf.text("คำอธิบาย: " + lines[0], 10, y); y += 6
          for (let i = 1; i < lines.length; i++) {
            pdf.text(lines[i], 30, y); y += 6
          }
          y += 2
        }
        pdf.text(`วันที่ส่ง: ${formatDate(doc.created_at)}`, 10, y); y += 8
        pdf.text(`สถานะ: ${STATUS_LABEL[doc.status] || doc.status}`, 10, y)
      })

      const blob = pdf.output("blob")
      const file = new File(
        [blob],
        `documents-all-${new Date().toISOString().slice(0, 10)}.pdf`,
        { type: "application/pdf" }
      )

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: "เอกสารทั้งหมด" })
      } else {
        const url = URL.createObjectURL(blob)
        const a = window.document.createElement("a")
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

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

  return (
    <>
      {(confirmSingle !== null || confirmBatch) && (
        <div
          className="overlay"
          onClick={confirmBatch ? cancelBatchDelete : cancelSingleDelete}
        >
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p style={{ marginBottom: 20, fontSize: "1.1rem" }}>
              {confirmBatch
                ? `ลบ ${selectedIds.size} รายการ?`
                : "ลบเอกสารนี้?"}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn-danger"
                onClick={confirmBatch ? confirmBatchDelete : confirmSingleDelete}
                style={{ flex: 1 }}
              >
                ลบ
              </button>
              <button
                className="btn-primary"
                onClick={confirmBatch ? cancelBatchDelete : cancelSingleDelete}
                style={{ flex: 1, background: "#888" }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="list-actions">
        <button
          className="btn-ghost"
          onClick={enterSelectMode}
          disabled={selectMode}
        >
          เลือกหลายรายการ
        </button>
        <button
          className="btn-ghost"
          onClick={handleExportAll}
          disabled={exporting}
        >
          {exporting ? "กำลังสร้าง PDF..." : "ส่งออก PDF ทั้งหมด"}
        </button>
      </div>

      {selectMode && (
        <div className="selection-bar">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn-ghost"
              onClick={toggleSelectAll}
              style={{ fontSize: "0.9rem" }}
            >
              {isAllSelected() ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
            </button>
            <span style={{ fontSize: "0.85rem", color: "#888" }}>
              เลือก {selectedIds.size} รายการ
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-danger"
              onClick={handleBatchDelete}
              disabled={selectedIds.size === 0 || deleting}
              style={{ padding: "8px 16px", fontSize: "0.9rem" }}
            >
              ลบที่เลือก ({selectedIds.size})
            </button>
            <button
              className="btn-ghost"
              onClick={exitSelectMode}
              style={{ fontSize: "0.9rem" }}
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {groups.map(([dateLabel, docs]) => (
          <div key={dateLabel}>
            <div className="date-header">
              --- {dateLabel} ---
            </div>
            {docs.map((doc) => (
              <div key={doc.id} className="doc-list-row">
                {selectMode && (
                  <label className="select-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                    />
                  </label>
                )}
                {selectMode ? (
                  <div
                    className="doc-list-item"
                    style={{ cursor: "default", flex: 1 }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{doc.doc_type}</div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#888",
                          marginTop: 2,
                        }}
                      >
                        {doc.sender_name} &rarr; {doc.recipient_name}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {statusBadge(doc.status)}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/receive/${doc.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div className="doc-list-item">
                      <div>
                        <div style={{ fontWeight: 600 }}>{doc.doc_type}</div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#888",
                            marginTop: 2,
                          }}
                        >
                          {doc.sender_name} &rarr; {doc.recipient_name}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {statusBadge(doc.status)}
                      </div>
                    </div>
                  </Link>
                )}
                {!selectMode && (
                  <button
                    onClick={() => handleSingleDelete(doc.id)}
                    disabled={deleting}
                    style={{
                      background: "none",
                      border: "none",
                      color: deleting ? "#ccc" : "#ff3b30",
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
        ))}
      </div>
    </>
  )
}
